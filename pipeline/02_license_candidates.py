"""
인허가 데이터에서 '홍대입구역 반경 안 + 영업 중 + 인허가 N년 이상' 노포 후보를 뽑고,
TourAPI 결과(data/tourapi_hongdae.csv)와 대조해서 사진·대표메뉴를 붙이는 스크립트.

준비
  1) 인허가 데이터 CSV를 data/ 폴더에 넣기 (파일명 자유, 아래 LICENSE_CSV 로 지정)
     - 서울 열린데이터광장에서 '마포구 일반음식점 인허가 정보' 검색 → CSV (작아서 권장)
     - 또는 data.go.kr '행정안전부_식품_일반음식점' 전국 파일 (크지만 같은 컬럼)
     - 신촌 쪽까지 보려면 '서대문구' 파일도 받아서 둘 다 넣으면 됨 (쉼표로 여러 개 지정)
  2) (선택) 백년가게 목록 CSV를 data/baeknyeon.csv 로 두면 '백년가게' 표시가 붙음
  3) pip install pandas pyproj
  4) python scripts/build_nopo_candidates.py

결과
  data/nopo_candidates.csv : 노포 후보 (업력, 업태, 좌표, TourAPI 사진·메뉴 매칭)
"""
import difflib
import math
import os
import re
import sys
from datetime import date

import pandas as pd
from pyproj import Transformer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DATA = os.path.join(ROOT, "data")

# ── 설정 ────────────────────────────────────────────────
LICENSE_CSV = os.environ.get("LICENSE_CSV", "mapo_restaurants.csv")   # 쉼표로 여러 파일 가능
TOUR_CSV = "tourapi_hongdae.csv"
BAEKNYEON_CSV = "baeknyeon.csv"
CENTER = (37.5572, 126.9245)          # 홍대입구역 (위도, 경도)
RADIUS_M = int(os.environ.get("RADIUS_M", "2500"))
MIN_YEARS = int(os.environ.get("MIN_YEARS", "30"))
SRC_EPSG = os.environ.get("SRC_EPSG", "5174")   # 인허가 좌표계. 위치가 엉뚱하면 2097 로 바꿔 실행
MATCH_DIST_M = 150                    # TourAPI와 같은 가게로 볼 최대 거리
MATCH_NAME_RATIO = 0.6                # 이름 유사도 기준
# ───────────────────────────────────────────────────────


def read_csv_any(path, **kw):
    for enc in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False, **kw)
        except UnicodeDecodeError:
            continue
    sys.exit(f"인코딩을 읽을 수 없어요: {path}")


def find_col(df, *keywords):
    """컬럼명이 파일마다 조금씩 달라서 키워드로 찾음."""
    for kw in keywords:
        for c in df.columns:
            if re.sub(r"[^가-힣a-z0-9]", "", kw.lower()) in re.sub(r"[^가-힣a-z0-9]", "", str(c).lower()):
                return c
    return None


def haversine(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def norm_name(s):
    s = re.sub(r"\(.*?\)|\[.*?\]", "", str(s))
    s = re.sub(r"(본점|직영점|\d+호점|주식회사|\(주\)|㈜)", "", s)
    return re.sub(r"[^가-힣A-Za-z0-9]", "", s).lower()


# 1) 인허가 데이터 읽기 ─────────────────────────────────
frames = []
for name in [x.strip() for x in LICENSE_CSV.split(",") if x.strip()]:
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        sys.exit(f"data/{name} 이 없어요. 인허가 CSV를 data/ 에 넣고 LICENSE_CSV 로 파일명을 지정하세요.")
    frames.append(read_csv_any(path))
lic = pd.concat(frames, ignore_index=True)
print(f"인허가 데이터 {len(lic):,}행 읽음")

c_name = find_col(lic, "사업장명")
c_date = find_col(lic, "인허가일자")
c_state = find_col(lic, "영업상태명", "상세영업상태명")
c_addr = find_col(lic, "도로명전체주소", "도로명주소")
c_jibun = find_col(lic, "소재지전체주소", "지번주소")
c_type = find_col(lic, "업태구분명", "위생업태명")
c_area = find_col(lic, "소재지면적", "시설총규모")
c_x = find_col(lic, "좌표정보(x)", "좌표정보x", "x좌표")
c_y = find_col(lic, "좌표정보(y)", "좌표정보y", "y좌표")
missing = [k for k, v in {"사업장명": c_name, "인허가일자": c_date, "영업상태": c_state, "좌표x": c_x, "좌표y": c_y}.items() if v is None]
if missing:
    print("컬럼 목록:", list(lic.columns))
    sys.exit(f"필요한 컬럼을 못 찾았어요: {missing}")

# 2) 영업 중 + N년 이상 ─────────────────────────────────
lic = lic[lic[c_state].astype(str).str.contains("영업|정상", na=False)]
lic["open_date"] = pd.to_datetime(lic[c_date].astype(str).str.replace(r"[^0-9]", "", regex=True).str[:8],
                                  format="%Y%m%d", errors="coerce")
today = pd.Timestamp(date.today())
lic["years"] = ((today - lic["open_date"]).dt.days / 365.25).round(1)
lic = lic[lic["years"] >= MIN_YEARS]
print(f"영업 중 + 인허가 {MIN_YEARS}년 이상: {len(lic):,}곳")

# 3) 좌표 변환 + 반경 필터 ──────────────────────────────
lic = lic.dropna(subset=[c_x, c_y])
lic = lic[(pd.to_numeric(lic[c_x], errors="coerce") > 0)]
tf = Transformer.from_crs(f"EPSG:{SRC_EPSG}", "EPSG:4326", always_xy=True)
lng, lat = tf.transform(pd.to_numeric(lic[c_x]).values, pd.to_numeric(lic[c_y]).values)
lic["lat"], lic["lng"] = lat, lng
if len(lic) and not (37.3 < lic["lat"].median() < 37.8 and 126.7 < lic["lng"].median() < 127.3):
    print(f"⚠ 변환된 좌표가 서울이 아니에요 (중앙값 {lic['lat'].median():.4f}, {lic['lng'].median():.4f}).")
    print("  SRC_EPSG=2097 python scripts/build_nopo_candidates.py 로 다시 실행해보세요.")
lic["dist_m"] = [round(haversine(CENTER[0], CENTER[1], a, b)) for a, b in zip(lic["lat"], lic["lng"])]
lic = lic[lic["dist_m"] <= RADIUS_M].copy()
print(f"홍대입구역 반경 {RADIUS_M}m 안: {len(lic):,}곳")

# 4) TourAPI 대조 ──────────────────────────────────────
tour_path = os.path.join(DATA, TOUR_CSV)
tour = read_csv_any(tour_path) if os.path.exists(tour_path) else pd.DataFrame()
if not tour.empty and "mapx" not in tour.columns:
    print("※ tourapi_hongdae.csv 에 좌표(mapx, mapy)가 없어서 이름만으로 대조해요.")


def match_tour(row):
    if tour.empty:
        return None
    best, best_score = None, 0
    n1 = norm_name(row[c_name])
    for _, t in tour.iterrows():
        ratio = difflib.SequenceMatcher(None, n1, norm_name(t.get("title", ""))).ratio()
        if "mapx" in tour.columns and pd.notna(t.get("mapx")):
            d = haversine(row["lat"], row["lng"], float(t["mapy"]), float(t["mapx"]))
            if d > MATCH_DIST_M:
                continue
            ratio += 0.2  # 가까우면 가산점
        if ratio > best_score:
            best, best_score = t, ratio
    return best if best_score >= MATCH_NAME_RATIO else None


out = []
for _, r in lic.iterrows():
    t = match_tour(r)
    out.append({
        "name": r[c_name],
        "open_date": r["open_date"].date().isoformat(),
        "years_by_license": r["years"],
        "type": r[c_type] if c_type else "",
        "area_m2": r[c_area] if c_area else "",
        "address": r[c_addr] if c_addr and pd.notna(r[c_addr]) else (r[c_jibun] if c_jibun else ""),
        "lat": round(r["lat"], 6),
        "lng": round(r["lng"], 6),
        "dist_m": r["dist_m"],
        "tour_contentid": t.get("contentid") if t is not None else "",
        "tour_title": t.get("title") if t is not None else "",
        "tour_firstimage": t.get("firstimage", "") if t is not None and "firstimage" in tour.columns else "",
        "tour_photos": t.get("photos", "") if t is not None else "",
        "tour_photo_types": t.get("photos_types", "") if t is not None else "",
        "tour_firstmenu": t.get("firstmenu", "") if t is not None else "",
        "tour_treatmenu": t.get("treatmenu", "") if t is not None else "",
        "source": "인허가데이터" + (" + TourAPI" if t is not None else ""),
    })
res = pd.DataFrame(out)

# 5) 백년가게 표시 (선택) ───────────────────────────────
bk_path = os.path.join(DATA, BAEKNYEON_CSV)
if os.path.exists(bk_path) and not res.empty:
    bk = read_csv_any(bk_path)
    bk_col = find_col(bk, "업체명", "상호", "사업장명")
    names = {norm_name(x) for x in bk[bk_col].dropna()} if bk_col else set()
    res["baeknyeon"] = res["name"].map(lambda x: norm_name(x) in names)

res = res.sort_values("years_by_license", ascending=False) if not res.empty else res
out_path = os.path.join(DATA, "nopo_candidates.csv")
res.to_csv(out_path, index=False, encoding="utf-8-sig")

print("\n=== 요약 ===")
print(f"노포 후보: {len(res)}곳")
if not res.empty:
    print(f"TourAPI 매칭: {(res['tour_contentid'] != '').sum()}곳 (그중 사진 있음 {(res['tour_firstimage'].astype(str).str.startswith('http')).sum()}곳)")
    if "baeknyeon" in res:
        print(f"백년가게: {res['baeknyeon'].sum()}곳")
    print("업태 상위:", res["type"].value_counts().head(5).to_dict())
    print("\n업력 상위 10곳:")
    print(res[["name", "open_date", "years_by_license", "type", "dist_m"]].head(10).to_string(index=False))
print(f"\n→ {os.path.normpath(out_path)} 저장")
