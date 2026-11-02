"""
03. 소상공인 상가정보로 업종 분류를 붙이고, 데이터 검사 플래그를 단다.

  - 매칭: 60m 이내 + 이름 유사도(rapidfuzz) 최고점. 이름이 안 맞으면 같은 좌표(15m)의 음식점 1곳만 있을 때 '위치만 일치'로 기록
  - sangga_unmatched: 상가정보에서 못 찾음 → 폐업·상호 변경 가능성
  - type_mismatch: 인허가 업태 ↔ 상가 업종이 다름 → 업종 전환 가능성
  - franchise_*: 브랜드 키워드 / 상가 지점명 (LLM 판정은 04)
  상가정보 파일이 없으면 분류 없이 통과시킨다(플래그는 franchise_keyword 만).

입력: data/interim/candidates.csv, data/raw/sangga_seoul.csv(선택)
출력: data/interim/enriched.csv
"""
import os
import re

import numpy as np
import pandas as pd
from rapidfuzz import fuzz

from config import INTERIM, RAW, norm_name, read_csv_any

MATCH_M = 60
NAME_MIN = 60
OUT = os.path.join(INTERIM, "enriched.csv")

cand = read_csv_any(os.path.join(INTERIM, "candidates.csv"), dtype=str, keep_default_na=False)
cand["lat"] = cand["lat"].astype(float)
cand["lng"] = cand["lng"].astype(float)
print(f"후보 {len(cand)}곳")

# 인허가 업태 → 허용되는 상가 중분류. 목록에 없는 업태(기타 등)는 검사하지 않는다.
ALLOWED = {
    "한식": {"한식", "주점", "기타 간이", "구내식당·뷔페"},
    "냉면집": {"한식"}, "식육(숯불구이)": {"한식", "주점"}, "탕류(보신용)": {"한식"},
    "중국식": {"중식"},
    "일식": {"일식", "한식", "주점"}, "횟집": {"한식", "일식", "주점"}, "복어취급": {"한식", "일식"},
    "경양식": {"서양식", "일식", "기타 간이", "주점"}, "패밀리레스트랑": {"서양식"},
    "분식": {"기타 간이", "한식"}, "김밥(도시락)": {"기타 간이", "한식"},
    "호프/통닭": {"주점", "기타 간이", "한식"}, "통닭(치킨)": {"기타 간이", "주점"},
    "정종/대포집/소주방": {"주점", "한식"}, "감성주점": {"주점"},
    "까페": {"비알코올"}, "라이브카페": {"비알코올", "주점"}, "전통찻집": {"비알코올"},
    "외국음식전문점(인도,태국등)": {"동남아시아", "기타 외국", "서양식"},
    "패스트푸드": {"기타 간이", "서양식"}, "뷔페식": {"구내식당·뷔페", "한식"},
}

BRAND_WORDS = [
    "스타벅스", "투썸", "이디야", "빽다방", "메가커피", "컴포즈", "할리스", "파스쿠찌", "엔제리너스", "커피빈", "탐앤탐스",
    "BBQ", "비비큐", "교촌", "BHC", "비에이치씨", "굽네", "네네치킨", "처갓집", "페리카나", "호식이", "또래오래",
    "맥도날드", "롯데리아", "버거킹", "KFC", "맘스터치", "서브웨이", "도미노", "피자헛", "미스터피자", "파파존스",
    "본죽", "김밥천국", "새마을식당", "한신포차", "역전할머니", "투다리", "놀부", "원할머니", "백채김치찌개",
    "홍콩반점", "빽보이", "파리바게뜨", "뚜레쥬르", "던킨", "배스킨",
]
BRANCH_RE = re.compile(r"[가-힣A-Za-z0-9]{2,}(점|지점|직영점)$")


def franchise_rules(name, branch):
    flags = []
    if any(w.lower() in name.lower() for w in BRAND_WORDS):
        flags.append("franchise_keyword")
    elif BRANCH_RE.search(re.sub(r"\s", "", name)) and not name.endswith(("본점",)):
        flags.append("franchise_branch_name")
    if branch and branch not in ("본점",):
        flags.append("franchise_sangga_branch")
    return flags


sangga_path = os.path.join(RAW, "sangga_seoul.csv")
sg = None
if os.path.exists(sangga_path):
    cols = ["상가업소번호", "상호명", "지점명", "상권업종대분류명", "상권업종중분류명", "상권업종소분류명", "시군구명", "도로명주소", "경도", "위도"]
    sg = pd.read_csv(sangga_path, usecols=cols, dtype=str, keep_default_na=False)
    sg = sg[sg["시군구명"] == "마포구"].copy()
    sg["lat"] = pd.to_numeric(sg["위도"], errors="coerce")
    sg["lng"] = pd.to_numeric(sg["경도"], errors="coerce")
    sg = sg.dropna(subset=["lat", "lng"]).reset_index(drop=True)
    for c in ("상권업종대분류명", "상권업종중분류명", "상권업종소분류명", "지점명"):
        sg[c] = sg[c].str.strip()
    sg["nname"] = sg["상호명"].map(norm_name)
    print(f"상가정보 마포구 {len(sg):,}곳")
    SG_LAT, SG_LNG = np.radians(sg["lat"].values), np.radians(sg["lng"].values)
else:
    print("※ data/raw/sangga_seoul.csv 없음 → 업종 분류 없이 진행")


def near(lat, lng, m):
    p = np.radians(lat)
    d = 2 * 6371000 * np.arcsin(np.sqrt(np.sin((SG_LAT - p) / 2) ** 2 + np.cos(p) * np.cos(SG_LAT) * np.sin((SG_LNG - np.radians(lng)) / 2) ** 2))
    idx = np.where(d <= m)[0]
    return sg.iloc[idx].assign(dist=d[idx])


rows = []
for _, c in cand.iterrows():
    out = dict(c)
    flags = []
    match, how = None, ""
    if sg is not None:
        cands = near(c["lat"], c["lng"], MATCH_M)
        if len(cands):
            n = norm_name(c["name"])
            scores = cands["nname"].map(lambda x: max(fuzz.ratio(n, x), fuzz.partial_ratio(n, x) if min(len(n), len(x)) >= 2 else 0))
            best = scores.idxmax()
            if scores[best] >= NAME_MIN:
                match, how = cands.loc[best], "name"
                out["sangga_name_score"] = int(scores[best])
            else:
                food = cands[(cands["상권업종대분류명"] == "음식") & (cands["dist"] <= 15)]
                if len(food) == 1:
                    match, how = food.iloc[0], "location_only"
        if match is None:
            flags.append("sangga_unmatched")
        else:
            mid = match["상권업종중분류명"]
            out.update({
                "sangga_id": match["상가업소번호"], "sangga_name": match["상호명"], "sangga_branch": match["지점명"],
                "sangga_l": match["상권업종대분류명"], "sangga_m": mid, "sangga_s": match["상권업종소분류명"],
                "sangga_dist_m": round(float(match["dist"])), "sangga_match": how,
                "sangga_category": " > ".join(x for x in (match["상권업종대분류명"], mid, match["상권업종소분류명"]) if x),
            })
            if how == "location_only":
                flags.append("sangga_name_differs")
            allowed = ALLOWED.get(c["biz_type"])
            if match["상권업종대분류명"] != "음식":
                flags.append("type_mismatch")
                out["type_mismatch_reason"] = f"인허가 {c['biz_type']} ↔ 상가 {out['sangga_category']} (음식점 아님)"
            elif allowed and mid not in allowed:
                flags.append("type_mismatch")
                out["type_mismatch_reason"] = f"인허가 {c['biz_type']} ↔ 상가 {out['sangga_category']}"
    flags += franchise_rules(c["name"], out.get("sangga_branch", "") if how == "name" else "")
    out["flags"] = "|".join(flags)
    rows.append(out)

res = pd.DataFrame(rows)
res.to_csv(OUT, index=False, encoding="utf-8-sig")

fl = res["flags"].str.split("|").explode()
print("\n=== 요약 ===")
if sg is not None:
    print(f"상가 매칭 {res['sangga_match'].eq('name').sum()} (위치만 {res['sangga_match'].eq('location_only').sum()}) / {len(res)}")
    print(f"매칭 거리 중앙값 {res['sangga_dist_m'].dropna().median()}m  ← 크면(>30m) 좌표계(SRC_EPSG) 확인")
print("플래그:", fl[fl != ""].value_counts().to_dict())
mm = res[res["flags"].str.contains("type_mismatch")]
if len(mm):
    print("업종 불일치 예:")
    print(mm[["name", "biz_type", "sangga_name", "sangga_category"]].head(10).to_string(index=False))
print(f"→ {OUT}")
