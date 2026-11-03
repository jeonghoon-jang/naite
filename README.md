# 나이테 (NAITE)

시간이 쌓인 가게, 홍대 노포를 찾는 모바일 웹. 홍대입구역 반경 1.8km의 인허가 30년 이상 식당을 공공데이터로 모아 지도·상세·챗봇으로 보여준다.

## 실행

```bash
# 1) 환경변수: .env.example 을 복사해 루트 .env 작성
# 2) 데이터 파이프라인 (Python 3.12)
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
.venv/bin/python pipeline/01_tourapi.py      # … 06_embed_upload.py 까지 순서대로
# 3) 웹
cd web && npm install && npm run dev
```

DB 스키마는 `supabase/migrations/*.sql`을 Supabase SQL Editor에서 실행한다. 자세한 규칙은 `CLAUDE.md`, 진행 기록은 `docs/PROGRESS.md`에 있다.

## 배포

- 프로덕션: https://naite-jade.vercel.app (Vercel Hobby, `main` push 시 자동 배포)
- Vercel 설정: Root Directory `web`, Framework Vite, 함수 리전 `fra1`(`web/vercel.json`)
- Vercel 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_KAKAO_JS_KEY`, `SUPABASE_URL`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBED_MODEL`, `KAKAO_REST_KEY`, `SIM_THRESHOLD`. `SUPABASE_SERVICE_ROLE_KEY`·`TOUR_KEY`는 넣지 않는다(파이프라인 전용).
- 카카오 developers → 앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인에 `http://localhost:5180`과 배포 주소를 등록한다.
- 챗봇 평가: `.venv/bin/python pipeline/eval/run_eval.py https://naite-jade.vercel.app`
