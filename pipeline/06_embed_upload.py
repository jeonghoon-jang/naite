"""
06. 검수 시트 갱신 → 공개 여부 판정 → search_text → 임베딩 → Supabase upsert + 부산집 목업 seed.

  .venv/bin/python pipeline/06_embed_upload.py            # 업로드까지
  .venv/bin/python pipeline/06_embed_upload.py --dry-run  # review.csv, processed 만 갱신

검수 시트 docs/review.csv
  keep 열: n → 숨김, y → 자동 숨김 규칙 무시하고 공개, 빈칸 → 자동 판정(auto_hidden)
  재실행해도 keep·note 는 slug 기준으로 보존된다.

입력: data/interim/with_kakao.jsonl, pipeline/seed/busanjip.json
출력: docs/review.csv, data/processed/stores.jsonl, data/processed/stores.csv, Supabase stores/menus/order_phrases/reels
"""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

import pandas as pd
import requests
from openai import OpenAI

from config import (INTERIM, OPENAI_EMBED_MODEL, PROCESSED, REVIEW_CSV, ROOT, SRC_BAEKNYEON, SRC_LICENSE, SRC_MODEL,
                    SRC_SANGGA, SRC_TOUR, need_env)

DRY = "--dry-run" in sys.argv
EMBED_CACHE = os.path.join(INTERIM, "embed_cache.jsonl")
SEED = os.path.join(ROOT, "pipeline", "seed", "busanjip.json")
NOW = datetime.now(timezone.utc).isoformat(timespec="seconds")

rows = [json.loads(l) for l in open(os.path.join(INTERIM, "with_kakao.jsonl"), encoding="utf-8")]
seed = json.load(open(SEED, encoding="utf-8"))


def auto_hide(r):
    reasons = []
    if r["franchise_suspect"]:
        reasons.append("프랜차이즈 의심" + (f"({r['franchise_reason']})" if r.get("franchise_reason") else ""))
    if r.get("sangga_l") and r["sangga_l"] != "음식":
        reasons.append(f"상가정보상 음식점 아님({r.get('sangga_category')})")
    return reasons


# 1) 검수 시트: 기존 keep/note 보존
prev = {}
if os.path.exists(REVIEW_CSV):
    p = pd.read_csv(REVIEW_CSV, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    prev = {r["slug"]: r for _, r in p.iterrows()}

for r in rows:
    if r["license_no"] == seed["license_no"]:
        r["slug"] = seed["slug"]
    r["auto_reasons"] = auto_hide(r)
    old = prev.get(r["slug"], {})
    r["keep"] = str(old.get("keep", "")).strip().lower()
    r["note"] = old.get("note", "")
    r["hidden"] = r["keep"] == "n" or (r["keep"] != "y" and bool(r["auto_reasons"]))

FLAG_KO = {
    "sangga_unmatched": "상가정보 미매칭", "sangga_name_differs": "상가 상호 다름", "type_mismatch": "업종 불일치",
    "franchise_keyword": "브랜드 키워드", "franchise_branch_name": "지점형 상호", "franchise_sangga_branch": "상가 지점명",
    "franchise_llm": "LLM 프랜차이즈", "kakao_unmatched": "카카오 미매칭",
}
review = pd.DataFrame([{
    "keep": r["keep"],
    "auto_hidden": "Y" if r["auto_reasons"] else "",
    "public": "N" if r["hidden"] else "Y",
    "flags": ", ".join(FLAG_KO.get(f, f) for f in r["flags"]),
    "name": r["name"], "slug": r["slug"], "license_date": r["license_date"], "years": r["years_by_license"],
    "biz_type": r["biz_type"], "sangga_name": r.get("sangga_name", ""), "sangga_category": r.get("sangga_category", ""),
    "reason": " / ".join(r["auto_reasons"] + ([r["type_mismatch_reason"]] if r.get("type_mismatch_reason") else [])),
    "menu_main": r["menu_main"] or "", "cuisine_tags": ", ".join(r["cuisine_tags"]),
    "address": r["address"], "dist_m": r["dist_m"], "kakao_place_url": r["kakao_place_url"] or "", "note": r["note"],
} for r in rows])
review["_o"] = review["flags"].eq("")
review = review.sort_values(["_o", "years"], ascending=[True, False]).drop(columns="_o")
review.to_csv(REVIEW_CSV, index=False, encoding="utf-8-sig")
print(f"검수 시트 {len(review)}행 (플래그 있음 {(review['flags'] != '').sum()}) → {REVIEW_CSV}")


# 2) 출처 + search_text
def sources(r):
    s = [{**SRC_LICENSE, "fetched_at": NOW[:10]}]
    if r.get("sangga_id"):
        s.append({**SRC_SANGGA, "fetched_at": NOW[:10]})
    if r["menu_source"] == "tourapi" or r.get("tour_contentid"):
        s.append({**SRC_TOUR, "fetched_at": NOW[:10]})
    if r["is_model_restaurant"]:
        s.append({**SRC_MODEL, "fetched_at": NOW[:10]})
    if r["is_baeknyeon"]:
        s.append({**SRC_BAEKNYEON, "fetched_at": NOW[:10]})
    for reason in r["auto_reasons"]:
        s.append({"name": "나이테 자동 검수", "note": reason})
    return s


MENU_SRC_KO = {"tourapi": "한국관광공사", "model_restaurant": "마포구 모범음식점", "traditional": "인허가 전통업소"}


def search_text(r):
    feats = [x for x, on in (("백년가게", r["is_baeknyeon"]), ("마포구 모범음식점", r["is_model_restaurant"])) if on]
    menu = f"{r['menu_main']} (출처: {MENU_SRC_KO[r['menu_source']]})" if r["menu_main"] else "확인되지 않음"
    return "\n".join([
        f"가게: {r['name']} ({r['name_en']})",
        f"업력: 인허가 기준 {r['license_date'][:4]}년부터, 약 {int(r['years_by_license'])}년",
        f"업종: {r['biz_type']} / {', '.join(r['cuisine_tags']) or '세부 업종 미확인'}",
        f"대표메뉴: {menu}",
        f"위치: {r['address']}, {r['dong']}, 홍대입구역에서 약 {r['dist_m']}m",
        f"특징: {', '.join(feats) or '없음'}",
        f"요약: {r['summary_ko']} / {r['summary_en']}",
    ])


stores = []
for r in rows:
    is_seed = r["slug"] == seed["slug"]
    stores.append({
        "slug": r["slug"], "license_no": r["license_no"], "name": r["name"], "name_en": r["name_en"],
        "lat": r["lat"], "lng": r["lng"], "address": r["address"], "dong": r["dong"] or None, "dist_m": r["dist_m"],
        "license_date": r["license_date"], "years_by_license": r["years_by_license"], "biz_type": r["biz_type"],
        "sangga_category": r.get("sangga_category") or None, "cuisine_tags": r["cuisine_tags"],
        "menu_main": r["menu_main"], "menu_source": r["menu_source"], "is_baeknyeon": r["is_baeknyeon"],
        "is_model_restaurant": r["is_model_restaurant"], "franchise_suspect": r["franchise_suspect"],
        "flags": r["flags"], "hidden": r["hidden"], "data_status": "candidate",
        "summary_ko": r["summary_ko"], "summary_en": r["summary_en"],
        "kakao_place_id": r["kakao_place_id"], "kakao_place_url": r["kakao_place_url"],
        "photo_url": seed["photo_url"] if is_seed else None, "photo_credit": seed["photo_credit"] if is_seed else None,
        "sources": sources(r), "search_text": search_text(r), "updated_at": NOW,
    })

os.makedirs(PROCESSED, exist_ok=True)
with open(os.path.join(PROCESSED, "stores.jsonl"), "w", encoding="utf-8") as f:
    for s in stores:
        f.write(json.dumps(s, ensure_ascii=False) + "\n")
pd.DataFrame(stores).drop(columns=["search_text", "sources"]).to_csv(os.path.join(PROCESSED, "stores.csv"), index=False, encoding="utf-8-sig")
print(f"매장 {len(stores)}곳 (공개 {sum(not s['hidden'] for s in stores)}, 숨김 {sum(s['hidden'] for s in stores)}) → data/processed/")
if seed["slug"] not in {s["slug"] for s in stores}:
    sys.exit(f"부산집 인허가 레코드({seed['license_no']})가 후보에 없어요. seed/busanjip.json 의 license_no 를 확인하세요.")
if DRY:
    sys.exit(0)

# 3) 임베딩 (search_text 해시 캐시)
(oa_key,) = need_env("OPENAI_API_KEY")
cache = {}
if os.path.exists(EMBED_CACHE):
    for line in open(EMBED_CACHE, encoding="utf-8"):
        c = json.loads(line)
        cache[c["key"]] = c["embedding"]


def ekey(text):
    return hashlib.sha256(f"{OPENAI_EMBED_MODEL}\n{text}".encode()).hexdigest()


todo = [s["search_text"] for s in stores if ekey(s["search_text"]) not in cache]
if todo:
    client = OpenAI(api_key=oa_key)
    with open(EMBED_CACHE, "a", encoding="utf-8") as f:
        for i in range(0, len(todo), 100):
            batch = todo[i:i + 100]
            resp = client.embeddings.create(model=OPENAI_EMBED_MODEL, input=batch)
            for text, d in zip(batch, resp.data):
                cache[ekey(text)] = d.embedding
                f.write(json.dumps({"key": ekey(text), "embedding": d.embedding}) + "\n")
print(f"임베딩: 새로 {len(todo)}, 캐시 {len(stores) - len(todo)}")
for s in stores:
    s["embedding"] = "[" + ",".join(f"{x:.7f}" for x in cache[ekey(s["search_text"])]) + "]"

# 4) Supabase upsert (service role, 파이프라인 전용)
sb_url, sb_key = need_env("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
H = {"apikey": sb_key, "Content-Type": "application/json"}
if not sb_key.startswith("sb_"):
    H["Authorization"] = f"Bearer {sb_key}"
REST = sb_url.rstrip("/") + "/rest/v1"


def rest(method, path, **kw):
    r = requests.request(method, f"{REST}/{path}", headers={**H, **kw.pop("headers", {})}, timeout=60, **kw)
    if r.status_code >= 300:
        sys.exit(f"Supabase {method} {path} 실패 {r.status_code}: {r.text[:500]}")
    return r.json() if r.text else None


for i in range(0, len(stores), 50):
    rest("POST", "stores?on_conflict=slug", json=stores[i:i + 50],
         headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
# 이번 결과에 없는 예전 행은 지우지 않고 숨긴다
slugs = ",".join(f'"{s["slug"]}"' for s in stores)
rest("PATCH", f"stores?slug=not.in.({slugs})", json={"hidden": True, "updated_at": NOW}, headers={"Prefer": "return=minimal"})

# 5) 부산집 목업 메뉴·주문문구·릴스: 우리 테이블의 부산집 행만 지우고 다시 넣는다
sid = rest("GET", f"stores?slug=eq.{seed['slug']}&select=id")[0]["id"]
for table, items in (("menus", seed["menus"]), ("order_phrases", seed["order_phrases"]), ("reels", seed["reels"])):
    rest("DELETE", f"{table}?store_id=eq.{sid}", headers={"Prefer": "return=minimal"})
    payload = [{"store_id": sid, "sort": i, **it} for i, it in enumerate(items)]
    if table != "order_phrases":
        for p in payload:
            p["is_mock"] = True
    rest("POST", table, json=payload, headers={"Prefer": "return=minimal"})

# 6) 다른 매장 릴스 목업: 공개 매장 중 업력 상위 4곳 (영상·사진 없음 → 화면에서 나이테 카드로 표시)
others = sorted((s for s in stores if not s["hidden"] and s["slug"] != seed["slug"]), key=lambda s: -s["years_by_license"])[:4]
ids = rest("GET", "stores?select=id,slug&slug=in.(" + ",".join(f'"{s["slug"]}"' for s in others) + ")")
by_slug = {x["slug"]: x["id"] for x in ids}
rest("DELETE", "reels?store_id=in.(" + ",".join(by_slug.values()) + ")", headers={"Prefer": "return=minimal"})
rest("POST", "reels", json=[{
    "store_id": by_slug[s["slug"]], "sort": 0, "video_url": None, "poster_url": None, "is_mock": True,
    "caption_ko": f"{s['license_date'][:4]}년부터, {s['dong'] or '홍대'} {s['name']}",
    "caption_en": f"{s['name_en']}, licensed since {s['license_date'][:4]}",
} for s in others], headers={"Prefer": "return=minimal"})

# 7) 확인
check = rest("GET", "stores?select=slug")
print("\n=== 업로드 확인 ===")
print(f"stores {len(check)}행")
cnt = requests.get(f"{REST}/stores?select=slug&embedding=is.null", headers={**H, "Prefer": "count=exact", "Range": "0-0"}, timeout=30)
print(f"임베딩 null: {cnt.headers.get('content-range', '?').split('/')[-1]}건")
print(f"공개 {sum(not s['hidden'] for s in stores)} / 숨김 {sum(s['hidden'] for s in stores)} / 프랜차이즈 의심 {sum(s['franchise_suspect'] for s in stores)}")
