"""
챗봇 범위 판정 평가. 로컬(vercel dev) 또는 배포 엔드포인트를 호출해 scope 정확도를 출력한다.

  .venv/bin/python pipeline/eval/run_eval.py                                  # http://localhost:3000
  .venv/bin/python pipeline/eval/run_eval.py https://<배포주소>
결과: data/interim/eval_result.csv, 콘솔 요약 (docs/PROGRESS.md 에 옮겨 적는다)
"""
import csv
import os
import sys
import time

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from config import INTERIM  # noqa: E402

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
rows = list(csv.DictReader(open(os.path.join(HERE, "ood_cases.csv"), encoding="utf-8")))
out, ok, tag_ok, tag_n = [], 0, 0, 0
for r in rows:
    t = time.time()
    try:
        d = requests.post(f"{base}/api/chat", json={"message": r["question"]}, timeout=60).json()
    except Exception as e:  # noqa: BLE001
        d = {"scope": f"error:{e}"}
    got = d.get("scope", f"error:{d.get('error')}")
    hit = got == r["expected_scope"]
    ok += hit
    if r["expected_tags"] and got == "in":
        tag_n += 1
        tag_ok += any(r["expected_tags"] in s.get("cuisine_tags", []) for s in d.get("stores", []))
    out.append({**r, "got": got, "ok": hit, "ms": int((time.time() - t) * 1000),
                "stores": "|".join(s["name"] for s in d.get("stores", [])), "answer": (d.get("answer") or "")[:80]})
    print(f"{'✓' if hit else '✗'} {r['question']:<40} expect={r['expected_scope']:<9} got={got:<9} {out[-1]['ms']}ms {out[-1]['stores']}")
    time.sleep(max(0, float(os.environ.get("EVAL_GAP", "5.2")) - (time.time() - t)))  # 서버의 IP별 분당 12회 제한 안쪽으로

with open(os.path.join(INTERIM, "eval_result.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
print(f"\n범위 정확도 {ok}/{len(rows)} ({ok / len(rows):.0%}) | 태그 적중 {tag_ok}/{tag_n} | 평균 {sum(o['ms'] for o in out) // len(out)}ms")
