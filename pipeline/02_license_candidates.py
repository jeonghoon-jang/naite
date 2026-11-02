"""
02. 마포구 일반음식점 인허가에서 '영업 중 + 인허가 30년 이상 + 홍대입구역 반경 1.8km' 후보를 뽑고
    TourAPI(대표메뉴), 모범음식점(주된음식), 백년가게 정보를 붙인다.

  .venv/bin/python pipeline/02_license_candidates.py
  SRC_EPSG=2097 .venv/bin/python pipeline/02_license_candidates.py   # 위치가 이상하면

입력: data/raw/mapo_restaurants.csv, data/interim/tourapi.csv, data/raw/model_restaurant.csv(선택),
      data/raw/baeknyeon.csv(선택)
출력: data/interim/candidates.csv
"""
import os
import re
import sys
from datetime import date

import pandas as pd
from pyproj import Transformer
from rapidfuzz import fuzz

from config import CENTER, INTERIM, MIN_YEARS, RADIUS_M, RAW, SRC_EPSG, haversine, norm_name, read_csv_any

TOUR_MATCH_M = 150
OUT = os.path.join(INTERIM, "candidates.csv")

lic_path = os.path.join(RAW, "mapo_restaurants.csv")
if not os.path.exists(lic_path):
    sys.exit("data/raw/mapo_restaurants.csv 가 없어요. 서울 열린데이터광장 '마포구 일반음식점 인허가 정보' CSV를 받아 넣어주세요.")
lic = read_csv_any(lic_path, dtype=str)
print(f"인허가 {len(lic):,}행")

lic = lic[lic["영업상태명"].str.contains("영업", na=False)].copy()
lic["open_date"] = pd.to_datetime(lic["인허가일자"].str.strip().str[:10], errors="coerce")
today = pd.Timestamp(date.today())
lic["years"] = ((today - lic["open_date"]).dt.days / 365.25).round(1)
lic = lic[lic["years"] >= MIN_YEARS].copy()
print(f"영업 중 + 인허가 {MIN_YEARS}년 이상: {len(lic):,}곳")

lic["x"] = pd.to_numeric(lic["좌표정보(X)"].str.strip(), errors="coerce")
lic["y"] = pd.to_numeric(lic["좌표정보(Y)"].str.strip(), errors="coerce")
no_xy = lic["x"].isna() | (lic["x"] <= 0)
if no_xy.any():
    print(f"좌표 없음 {no_xy.sum()}곳 제외: {lic.loc[no_xy, '사업장명'].tolist()[:10]}")
lic = lic[~no_xy].copy()
tf = Transformer.from_crs(f"EPSG:{SRC_EPSG}", "EPSG:4326", always_xy=True)
lic["lng"], lic["lat"] = tf.transform(lic["x"].values, lic["y"].values)
if not (37.4 < lic["lat"].median() < 37.7 and 126.8 < lic["lng"].median() < 127.1):
    sys.exit(f"변환 좌표가 서울이 아니에요(EPSG:{SRC_EPSG}). SRC_EPSG=2097 로 다시 실행해보세요.")
lic["dist_m"] = [round(haversine(CENTER[0], CENTER[1], a, b)) for a, b in zip(lic["lat"], lic["lng"])]
lic = lic[lic["dist_m"] <= RADIUS_M].copy()
print(f"홍대입구역 반경 {RADIUS_M}m 안: {len(lic):,}곳")

# TourAPI 매칭 (이름 유사도 + 150m 이내)
tour_path = os.path.join(INTERIM, "tourapi.csv")
tour = read_csv_any(tour_path, dtype=str) if os.path.exists(tour_path) else pd.DataFrame()
if tour.empty:
    print("※ data/interim/tourapi.csv 없음 → TourAPI 매칭 건너뜀 (01 먼저 실행)")


def match_tour(r):
    best, best_score = None, 0
    n1 = norm_name(r["사업장명"])
    for _, t in tour.iterrows():
        if pd.isna(t.get("mapx")):
            continue
        if haversine(r["lat"], r["lng"], float(t["mapy"]), float(t["mapx"])) > TOUR_MATCH_M:
            continue
        score = fuzz.ratio(n1, norm_name(t["title"]))
        if score > best_score:
            best, best_score = t, score
    return best if best_score >= 70 else None


# 모범음식점: 허가(신고)번호 = 인허가 관리번호 로 정확히 연결
model = {}
mp = os.path.join(RAW, "model_restaurant.csv")
if os.path.exists(mp):
    m = read_csv_any(mp, dtype=str).sort_values("지정년도")
    model = {row["허가(신고)번호"].strip(): row for _, row in m.iterrows()}

# 백년가게: 이름 + '마포구' 주소
bk_names = set()
bp = os.path.join(RAW, "baeknyeon.csv")
if os.path.exists(bp):
    b = read_csv_any(bp, dtype=str)
    bk_names = {norm_name(n) for n in b.loc[b["업체주소"].str.contains("마포구", na=False), "업체명"]}


def dong_of(addr):
    m = re.search(r"\(([가-힣0-9]+동)", str(addr))
    return m.group(1) if m else None


def slug_of(no):
    parts = no.strip().split("-")
    return f"mapo-{parts[2]}-{parts[3]}" if len(parts) == 4 else "mapo-" + re.sub(r"[^0-9]", "", no)


def clean(v):
    return "" if pd.isna(v) else str(v).strip()


out = []
for _, r in lic.iterrows():
    t = match_tour(r) if not tour.empty else None
    mr = model.get(r["관리번호"].strip())
    road, jibun = clean(r["도로명주소"]), clean(r["지번주소"])
    out.append({
        "slug": slug_of(r["관리번호"]),
        "license_no": r["관리번호"].strip(),
        "name": clean(r["사업장명"]),
        "license_date": r["open_date"].date().isoformat(),
        "years_by_license": r["years"],
        "biz_type": clean(r["업태구분명"]),
        "area_m2": clean(r["소재지면적"]),
        "address": road or jibun,
        "jibun_address": jibun,
        "dong": dong_of(road) or (re.search(r"([가-힣0-9]+동)\s", jibun).group(1) if re.search(r"([가-힣0-9]+동)\s", jibun) else ""),
        "lat": round(r["lat"], 6),
        "lng": round(r["lng"], 6),
        "dist_m": r["dist_m"],
        "traditional_food": clean(r.get("전통업소주된음식")),
        "model_food": clean(mr["주된음식"]) if mr is not None else "",
        "is_model_restaurant": mr is not None,
        "is_baeknyeon": norm_name(r["사업장명"]) in bk_names,
        "tour_contentid": clean(t["contentid"]) if t is not None else "",
        "tour_title": clean(t["title"]) if t is not None else "",
        "tour_firstmenu": clean(t.get("firstmenu")) if t is not None else "",
        "tour_treatmenu": clean(t.get("treatmenu")) if t is not None else "",
    })
res = pd.DataFrame(out).sort_values("years_by_license", ascending=False)
os.makedirs(INTERIM, exist_ok=True)
res.to_csv(OUT, index=False, encoding="utf-8-sig")

print("\n=== 요약 ===")
print(f"후보 {len(res)}곳 | TourAPI 매칭 {(res['tour_contentid'] != '').sum()} | 모범음식점 {res['is_model_restaurant'].sum()} | 백년가게 {res['is_baeknyeon'].sum()}")
print("업태:", res["biz_type"].value_counts().to_dict())
print(res[["name", "license_date", "years_by_license", "biz_type", "dist_m"]].head(8).to_string(index=False))
print(f"→ {OUT}")
