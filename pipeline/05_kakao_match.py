"""
05. 카카오 로컬 키워드 검색으로 장소 ID·URL만 매칭한다.
    약관상 카카오 응답은 저장하지 않는다 → place_id, place_url 외 필드는 메모리에서 버린다.
    우리 좌표(공공데이터)와 80m 이내 + 이름 유사한 결과만 채택.

입력: data/interim/normalized.jsonl
출력: data/interim/with_kakao.jsonl
"""
import json
import os
import time

import requests
from rapidfuzz import fuzz

from config import INTERIM, haversine, need_env, norm_name

MATCH_M = 80
OUT = os.path.join(INTERIM, "with_kakao.jsonl")
(KEY,) = need_env("KAKAO_REST_KEY")


def search(name, lat, lng):
    r = requests.get(
        "https://dapi.kakao.com/v2/local/search/keyword.json",
        headers={"Authorization": f"KakaoAK {KEY}"},
        params={"query": name, "x": lng, "y": lat, "radius": 300, "sort": "distance", "size": 15},
        timeout=10,
    )
    r.raise_for_status()
    best, best_score = None, 0
    n = norm_name(name)
    for d in r.json().get("documents", []):
        if haversine(lat, lng, float(d["y"]), float(d["x"])) > MATCH_M:
            continue
        score = max(fuzz.ratio(n, norm_name(d["place_name"])), fuzz.partial_ratio(n, norm_name(d["place_name"])))
        if score > best_score:
            best, best_score = d, score
    if best is None or best_score < 70:
        return None, None
    return best["id"], best["place_url"]


rows = [json.loads(l) for l in open(os.path.join(INTERIM, "normalized.jsonl"), encoding="utf-8")]
hit = 0
for r in rows:
    pid, url = search(r["name"], r["lat"], r["lng"])
    r["kakao_place_id"], r["kakao_place_url"] = pid, url
    if pid:
        hit += 1
    elif "kakao_unmatched" not in r["flags"]:
        r["flags"].append("kakao_unmatched")
    time.sleep(0.05)

with open(OUT, "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(f"카카오 매칭 {hit}/{len(rows)} (미매칭은 flags 에 kakao_unmatched)")
print(f"→ {OUT}")
