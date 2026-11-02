# 나이테 (NAITE)

시간이 쌓인 가게, 홍대 노포를 찾는 모바일 웹. 서비스 지역은 **홍대입구역(37.5572, 126.9245) 반경 1.8km**만이고, 그 밖은 "아직 서비스 지역이 아님"으로 안내한다.

- MVP 범위: 지도·목록, 매장 상세(나이테 카드·로드뷰), AI 챗봇, 부산집 영어 메뉴·주문 카드(목업), 릴스(목업), 저장(localStorage), 한/EN 전환

## 화면 구조

- **하단 탭 3개**: 지도(`/`) · 릴스(`/reels`) · AI 챗봇(`/ask`). 세 화면은 하나의 레이아웃(`TabsLayout`)에 가로로 나란히 마운트돼 탭을 오가도 상태가 유지된다.
- 탭 간 **좌우 스와이프 전환**. 단 `data-noswipe` 영역(지도, 필터 칩 줄)에서 시작한 제스처는 지도·가로 스크롤 조작으로 남긴다.
- **저장은 별도 탭이 없다**: 카드·상세의 하트 버튼으로 저장(localStorage `naite:saved`), 지도 탭의 `저장됨` 필터 칩으로 모아 본다.
- 탭 밖 화면(하단 탭 없음, 뒤로가기 헤더): 상세 `/s/:slug`, 메뉴 `/s/:slug/menu`, 주문 카드 `/s/:slug/order?items=<sort>:<qty>,...`
- 화면별 DB 요청: 지도 1회(전체 공개 매장), 상세 1회(매장+출처+메뉴 유무 embed), 메뉴/주문 1회(매장+menus+order_phrases embed), 릴스 1회(reels+stores embed), 챗봇은 `/api/chat` 1회. `src/lib/supabase.ts`의 메모리 캐시로 같은 요청을 반복하지 않는다.
- 하지 않는 것: 회원가입, 결제, 주문 전송, 리뷰, 점주 계정, 관리자 페이지, 일본어·중국어, 사용자 현재 위치 사용

## 스택·구조

| 폴더 | 내용 | 실행 |
| --- | --- | --- |
| `web/` | React + Vite + TS + React Router + Tailwind. Vercel Root Directory | `cd web && npm run dev` / `npm run build` |
| `web/api/` | Vercel Functions (Node), 리전 `fra1` | `cd web && npx vercel dev` |
| `pipeline/` | Python 데이터 파이프라인 (로컬, `.venv`) | `.venv/bin/python pipeline/0x_*.py` (01→06 순서) |
| `pipeline/eval/` | 챗봇 범위 판정 평가 | `.venv/bin/python pipeline/eval/run_eval.py` |
| `supabase/migrations/` | SQL. 공용 프로젝트라 SQL Editor에서 수동 실행 | — |
| `data/raw/` | 원본 공공데이터 (커밋 금지) | — |
| `data/interim/` | 중간 산출물, LLM 캐시 (커밋 금지) | — |
| `data/processed/` | 최종 `stores.jsonl`/`stores.csv` (커밋) | — |
| `docs/review.csv` | 사람 검수 시트. `keep=n` → 숨김, `keep=y` → 자동 숨김 규칙 무시 | — |

## 환경변수 (루트 `.env` 하나, 값은 커밋 금지)

| 이름 | 용도 | 쓰는 곳 |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | DB 읽기 (RLS) | 브라우저 |
| `VITE_KAKAO_JS_KEY` | 지도·로드뷰 SDK | 브라우저 |
| `SUPABASE_URL` | DB 주소 | 서버, 파이프라인 |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 쓰기 | **파이프라인만** (api는 anon 키 + RPC) |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBED_MODEL` | 챗봇·정규화·임베딩 | 서버, 파이프라인 |
| `KAKAO_REST_KEY` | 장소 ID 매칭, 챗봇 지역 판정 | 서버, 파이프라인 |
| `SIM_THRESHOLD` | 챗봇 "결과 없음" 기준 | 서버 |
| `TOUR_KEY` | TourAPI | 파이프라인 |

## 데이터 원칙

- 모든 매장 정보에 출처(`sources`)가 있어야 한다. 입력에 없는 사실(맛, 인기, 분위기, 개업 사연)은 만들지 않는다.
- 업력은 항상 "인허가 기준"이라고 쓴다.
- 목업(부산집 메뉴·사진·릴스)에는 `예시` 뱃지, 검수 전 데이터에는 `검수 전` 뱃지를 붙인다.
- 카카오 로컬 API 응답은 **장소 ID와 URL만** 저장한다. 좌표·주소는 공공데이터 것을 쓴다.
- 카카오, 네이버, 블로그, 리뷰 사진은 가져오거나 저장하지 않는다. 로드뷰는 SDK로 실시간 표시만 한다.
- TourAPI 사진은 "사진: 한국관광공사"로 표시하고, 공공누리 3유형은 크롭하지 않는다.
- 프랜차이즈 의심이나 검수 제외는 삭제하지 않고 숨긴다(`franchise_suspect`, `hidden`).

## Supabase (공용 프로젝트, Frankfurt)

- 팀장 소유 공용 프로젝트다. **새 테이블·함수만 만들고**, 기존 객체를 수정·삭제하는 SQL은 실행 전에 사용자에게 묻는다.
- 화면당 DB 요청은 하나로 묶거나(embed select, RPC) 병렬로(`Promise.all`) 보낸다.

## UI 원칙

- 장식보다 정보를 우선한다. 그라데이션, 글래스, 큰 그림자, 이모지, 컬러 원형 아이콘은 쓰지 않는다. 흰 배경에 얇은 구분선을 쓴다.
- 강조색은 1개(임시 `#B5541C`)와 회색 단계만 쓴다. 폰트는 Pretendard. 모바일 우선이고 PC에서는 가운데 480px로 보인다.
- 사실을 크게 보여준다: "1983년부터 · 43년째(인허가 기준)". 가짜 숫자는 쓰지 않는다.
- 사진 대신 나이테 카드(`NaiteRing`, 10년 = 1겹)를 쓴다. 로드뷰는 접이식으로 지연 로딩한다.

## Git

- `main`은 Vercel 프로덕션이다. 작업은 `feat/`, `fix/`, `chore/` 브랜치에서 한다. 단계가 끝나면 push한 뒤 사용자에게 알리고 `main`에 `--no-ff`로 merge한다.
- 커밋은 Conventional Commits(한국어 허용)로 한 커밋에 한 변경만 담는다. 커밋 작성자는 장정훈이고, Co-Authored-By 트레일러는 넣지 않는다.
- 커밋 전에 `git status`와 `git diff --staged`로 `.env`, 키, `data/raw/`가 없는지 확인한다.
- `--force`, `reset --hard`, 히스토리 수정, 테이블 drop은 하기 전에 묻는다.

## 작업 방식

작게 만들고 빌드·타입체크·실행으로 검증한 뒤 커밋한다. 모르면 추측하지 말고 묻는다. 단계마다 `docs/PROGRESS.md`를 갱신한다.
