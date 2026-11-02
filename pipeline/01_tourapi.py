"""
TourAPI(한국관광공사 국문 관광정보 KorService2)로
홍대입구역 반경 안 음식점이 몇 곳이고, 사진·메뉴 정보가 얼마나 있는지 세는 스크립트.

준비
  1) data.go.kr 에서 '한국관광공사_국문 관광정보 서비스_GW' 활용신청 → 일반 인증키(Decoding) 복사
  2) pip install requests
  3) 레포 루트 .env 에 TOUR_KEY=발급받은키 를 적거나, export TOUR_KEY="발급받은키"
  4) python scripts/tourapi_hongdae_check.py

결과
  - 터미널에 요약 출력
  - data/tourapi_hongdae.csv : 매장별 사진 수, 공공누리 유형, 대표메뉴, 개업일
"""
import csv
import os
import sys
import time

import requests

BASE = "https://apis.data.go.kr/B551011/KorService2"


def load_dotenv():
    """레포 루트나 현재 폴더의 .env 에서 TOUR_KEY 를 읽어요 (export 안 해도 됨)."""
    here = os.path.dirname(os.path.abspath(__file__))
    for path in (".env", os.path.join(here, "..", ".env")):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    if "=" in line and not line.lstrip().startswith("#"):
                        k, v = line.strip().split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_dotenv()
KEY = os.environ.get("TOUR_KEY")
CENTER = (126.9245, 37.5572)   # 홍대입구역 (경도, 위도)
RADIUS_M = 2500
DETAIL_LIMIT = int(os.environ.get("DETAIL_LIMIT", "300"))  # 상세 조회할 최대 매장 수 (트래픽 절약)

if not KEY:
    sys.exit("TOUR_KEY 환경변수에 인증키(Decoding)를 넣어주세요.")


def call(op, **params):
    p = {"serviceKey": KEY, "MobileOS": "ETC", "MobileApp": "naite", "_type": "json"}
    p.update(params)
    r = requests.get(f"{BASE}/{op}", params=p, timeout=20)
    r.raise_for_status()
    try:
        body = r.json()["response"]["body"]
    except Exception:
        print(f"[{op}] 예상과 다른 응답:", r.text[:300])
        return [], 0
    items = body.get("items") or {}
    items = items.get("item", []) if isinstance(items, dict) else []
    if isinstance(items, dict):
        items = [items]
    return items, int(body.get("totalCount", 0))


# 1) 반경 안 음식점 목록
stores, page = [], 1
while True:
    items, total = call("locationBasedList2", mapX=CENTER[0], mapY=CENTER[1], radius=RADIUS_M,
                        contentTypeId=39, numOfRows=100, pageNo=page, arrange="E")
    stores += items
    if page == 1:
        print(f"반경 {RADIUS_M}m 음식점: {total}곳")
        if items:
            print("목록 응답 필드:", sorted(items[0].keys()))
    if len(stores) >= total or not items:
        break
    page += 1
    time.sleep(0.2)

rows = []
for i, s in enumerate(stores):
    row = {
        "contentid": s.get("contentid"),
        "title": s.get("title"),
        "addr": s.get("addr1"),
        "dist_m": s.get("dist"),
        "mapx": s.get("mapx"),
        "mapy": s.get("mapy"),
        "modifiedtime": s.get("modifiedtime"),
        "has_firstimage": bool(s.get("firstimage")),
        "list_copyright": s.get("cpyrhtDivCd", ""),
    }
    if i < DETAIL_LIMIT:
        # 2) 사진 목록 (Y=일반 사진, N=음식 메뉴 사진) + 공공누리 유형
        for flag, key in (("Y", "photos"), ("N", "menu_photos")):
            imgs, _ = call("detailImage2", contentId=row["contentid"], imageYN=flag)
            row[key] = len(imgs)
            row[key + "_types"] = "|".join(sorted({im.get("cpyrhtDivCd", "?") for im in imgs}))
        # 3) 소개정보 (대표메뉴, 취급메뉴, 개업일, 영업시간)
        intro, _ = call("detailIntro2", contentId=row["contentid"], contentTypeId=39)
        if intro:
            if i == 0:
                print("소개정보 필드:", sorted(intro[0].keys()))
            for f in ("firstmenu", "treatmenu", "opendatefood", "opentimefood", "restdatefood"):
                row[f] = (intro[0].get(f) or "").replace("\n", " ")
        time.sleep(0.2)
    rows.append(row)

# 요약
n = len(rows)
detailed = rows[:DETAIL_LIMIT]
def cnt(cond): return sum(1 for r in detailed if cond(r))
print("\n=== 요약 ===")
print(f"음식점 {n}곳 (상세 조회 {len(detailed)}곳)")
print(f"대표 이미지 있음: {sum(r['has_firstimage'] for r in rows)}곳")
print(f"일반 사진 1장 이상: {cnt(lambda r: r.get('photos', 0) > 0)}곳")
print(f"음식 메뉴 사진 1장 이상: {cnt(lambda r: r.get('menu_photos', 0) > 0)}곳")
print(f"대표메뉴 정보 있음: {cnt(lambda r: r.get('firstmenu'))}곳")
print(f"개업일 정보 있음: {cnt(lambda r: r.get('opendatefood'))}곳")

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "tourapi_hongdae.csv")
with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
    keys = sorted({k for r in rows for k in r})
    w = csv.DictWriter(f, fieldnames=keys)
    w.writeheader()
    w.writerows(rows)
print(f"\n→ {os.path.normpath(out_path)} 저장. 인허가 노포 목록과 이름·주소로 대조하면 겹치는 곳을 알 수 있어요.")
