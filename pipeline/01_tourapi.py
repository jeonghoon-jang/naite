"""
01. TourAPI(KorService2)로 홍대입구역 주변 음식점의 좌표·대표메뉴·사진 정보를 모은다.

  .venv/bin/python pipeline/01_tourapi.py          # data/interim/tourapi.csv 가 있으면 건너뜀
  .venv/bin/python pipeline/01_tourapi.py --force  # 다시 호출

출력: data/interim/tourapi.csv
"""
import csv
import os
import sys
import time

import requests

from config import CENTER, INTERIM, RADIUS_M, need_env

BASE = "https://apis.data.go.kr/B551011/KorService2"
OUT = os.path.join(INTERIM, "tourapi.csv")
FETCH_RADIUS = RADIUS_M + 200  # 경계 매장 매칭용 여유

if os.path.exists(OUT) and "--force" not in sys.argv:
    print(f"{OUT} 이미 있음 → 건너뜀 (--force 로 다시 호출)")
    sys.exit(0)

(KEY,) = need_env("TOUR_KEY")


def call(op, **params):
    p = {"serviceKey": KEY, "MobileOS": "ETC", "MobileApp": "naite", "_type": "json", **params}
    r = requests.get(f"{BASE}/{op}", params=p, timeout=20)
    r.raise_for_status()
    try:
        body = r.json()["response"]["body"]
    except Exception:
        print(f"[{op}] 예상과 다른 응답:", r.text[:300])
        return [], 0
    items = body.get("items") or {}
    items = items.get("item", []) if isinstance(items, dict) else []
    return ([items] if isinstance(items, dict) else items), int(body.get("totalCount", 0))


stores, page = [], 1
while True:
    items, total = call("locationBasedList2", mapX=CENTER[1], mapY=CENTER[0], radius=FETCH_RADIUS,
                        contentTypeId=39, numOfRows=100, pageNo=page, arrange="E")
    stores += items
    if len(stores) >= total or not items:
        break
    page += 1
    time.sleep(0.2)
print(f"반경 {FETCH_RADIUS}m TourAPI 음식점: {len(stores)}곳")

rows = []
for s in stores:
    row = {
        "contentid": s.get("contentid"), "title": s.get("title"), "addr": s.get("addr1"),
        "dist_m": s.get("dist"), "mapx": s.get("mapx"), "mapy": s.get("mapy"),
        "modifiedtime": s.get("modifiedtime"), "firstimage": s.get("firstimage", ""),
        "list_copyright": s.get("cpyrhtDivCd", ""),
    }
    for flag, key in (("Y", "photos"), ("N", "menu_photos")):
        imgs, _ = call("detailImage2", contentId=row["contentid"], imageYN=flag)
        row[key] = len(imgs)
        row[key + "_types"] = "|".join(sorted({im.get("cpyrhtDivCd", "?") for im in imgs}))
    intro, _ = call("detailIntro2", contentId=row["contentid"], contentTypeId=39)
    if intro:
        for f in ("firstmenu", "treatmenu", "opendatefood", "opentimefood", "restdatefood"):
            row[f] = (intro[0].get(f) or "").replace("\n", " ")
    rows.append(row)
    time.sleep(0.2)

os.makedirs(INTERIM, exist_ok=True)
with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    keys = sorted({k for r in rows for k in r})
    w = csv.DictWriter(f, fieldnames=keys)
    w.writeheader()
    w.writerows(rows)
print(f"대표메뉴 있음 {sum(1 for r in rows if r.get('firstmenu'))}곳, 대표이미지 있음 {sum(1 for r in rows if r['firstimage'])}곳")
print(f"→ {OUT}")
