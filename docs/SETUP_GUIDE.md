# 나이테 — 개발자가 직접 할 일 (계정·키·배포·Figma)

Claude Code가 코드를 짜는 동안, 아래는 **사람이 직접** 해야 하는 일이에요. 위에서부터 순서대로 하면 돼요.
키는 전부 레포 루트의 `.env`에 넣고(커밋 금지), 배포용은 Vercel 환경변수에 따로 넣어요.

---

## 1. 데이터 파일 받기 (10분)

`~/naite/data/raw/`에 저장해요.

| 파일 | 어디서 | 저장 이름 |
| --- | --- | --- |
| 마포구 일반음식점 인허가 | 서울 열린데이터광장 → [내려받기(CSV)] | `mapo_restaurants.csv` |
| 소상공인 상가(상권)정보 서울 | data.go.kr "소상공인시장진흥공단_상가(상권)정보" → 서울 파일 | `sangga_seoul.csv` |
| (선택) 백년가게 지정 리스트 | data.go.kr "전국 백년가게 지정리스트" | `baeknyeon.csv` |
| (선택) 마포구 모범음식점 지정 현황 | 서울 열린데이터광장 검색 | `model_restaurant.csv` |

상가정보는 용량이 커요. 오늘 못 받으면 Claude Code가 그 단계를 건너뛰고 진행해요(업종 세부분류만 빠짐).

## 2. Supabase (15분)

1. supabase.com → New project. 리전 **Northeast Asia (Seoul)**. DB 비밀번호는 따로 저장.
2. Settings → API에서 복사
   - Project URL → `VITE_SUPABASE_URL`, `SUPABASE_URL`
   - anon(또는 publishable) key → `VITE_SUPABASE_ANON_KEY`
   - service_role(또는 secret) key → `SUPABASE_SERVICE_ROLE_KEY` (**절대 브라우저·커밋 금지**)
3. 마이그레이션 SQL은 Claude Code가 `supabase/migrations/`에 만들어줘요. SQL Editor에 붙여넣고 Run.
   (pgvector는 SQL 첫 줄 `create extension if not exists vector;`로 켜져요.)
4. 무료 플랜은 7일 동안 활동이 없으면 일시정지돼요. 시연 전날 한 번 접속해 두세요.

## 3. 카카오 (10분)

1. developers.kakao.com → 내 애플리케이션 → 앱 만들기 (이름: 나이테)
2. 앱 키에서 복사
   - **JavaScript 키** → `VITE_KAKAO_JS_KEY` (지도·로드뷰, 브라우저용)
   - **REST API 키** → `KAKAO_REST_KEY` (장소 ID 매칭·챗봇 지역 판정, 서버용)
3. 플랫폼 → Web → 사이트 도메인 등록: `http://localhost:5173` + Vercel 주소(배포 후 추가)
4. 콘솔에 "카카오맵" 사용 설정 스위치가 보이면 ON으로 켜요.

## 4. OpenAI (5분)

1. platform.openai.com → API keys → Create (이름: naite) → `OPENAI_API_KEY`
2. Billing에 소액 충전(5달러면 충분). **Usage limits에서 월 한도를 낮게(예: 10달러) 설정**해 두세요.
3. 예상 비용: 매장 200곳 정규화 + 임베딩은 1달러 미만, 챗봇은 질문당 1원 단위.
4. 모델은 `.env`의 `OPENAI_CHAT_MODEL`(기본 `gpt-5.4-mini`), `OPENAI_EMBED_MODEL`(`text-embedding-3-small`)로 바꿔요.

## 5. TourAPI (이미 완료)

`TOUR_KEY`를 `.env`에 넣어두면 돼요.

## 6. `.env` 완성 예시 (루트, 커밋 금지)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_KAKAO_JS_KEY=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-5.4-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
KAKAO_REST_KEY=...
TOUR_KEY=...
SIM_THRESHOLD=0.25
```

## 7. Vercel 배포 (Step 3 끝나고, 15분)

1. vercel.com → Add New → Project → GitHub `naite` 레포 선택
2. **Root Directory: `web`**, Framework: Vite (자동 인식)
3. Environment Variables에 `.env`의 값 중 **`TOUR_KEY`를 뺀 전부** 입력
   (`VITE_`로 시작하는 건 브라우저용, 나머지는 `web/api/chat.ts`가 서버에서 읽어요)
4. Deploy → 나온 주소를 카카오 플랫폼 도메인에 추가
5. 이후에는 `main`에 push할 때마다 자동 배포, 다른 브랜치는 미리보기 URL이 생겨요.

## 8. Figma + Claude Code (로고·디자인)

**연결 (한 번만)**

```bash
claude plugin install figma@claude-plugins-official
```
Claude Code 재시작 → `/plugin` → figma 선택 → 로그인.
(수동: `claude mcp add --transport http figma https://mcp.figma.com/mcp` → 새 세션에서 `/mcp`로 인증)

Figma 원격 MCP는 디자인 읽기(컴포넌트·변수·레이아웃), 선택한 프레임을 코드로 변환, **캔버스에 직접 쓰기**, 실행 중인 웹 화면을 Figma 레이어로 보내기를 지원해요.

**추천 순서**

1. **레퍼런스 모으기**: 로고·사이트 레퍼런스 이미지를 Figma 파일 하나(`NAITE Design`)의 "References" 페이지에 붙여요.
2. **브랜드 토큰 먼저**: Claude Code에 "References 페이지를 보고 나이테 브랜드 컬러 1개 + 회색 단계, 타이포(Pretendard) 스케일을 Figma 변수로 만들어줘"라고 요청해요.
3. **로고**: 컨셉은 "나이테 동심원 + 워드마크 NAITE/나이테". Claude Code에 Figma 캔버스에 시안 3개를 그리게 하고, 고른 뒤에는 Figma에서 직접 다듬어요. 최종본은 SVG로 export해서 `web/public/logo.svg`로 넣어요.
4. **화면 디자인**: 이미 동작하는 웹 화면(지도·상세·챗봇)을 Figma로 보내 레이어로 만든 뒤, Figma에서 수정해요. 수정이 끝나면 "이 프레임대로 코드 맞춰줘"라고 요청해요. **코드가 먼저 돌아가고 디자인을 입히는 순서**가 오늘 일정에는 더 안전해요.
5. 디자인 토큰이 확정되면 Claude Code가 `tailwind.config`에 반영하게 해요.

주의: AI 티를 줄이려면 레퍼런스를 구체적으로 주고("이 앱의 리스트 밀도, 이 사이트의 타이포"), 그라데이션·일러스트·이모지는 쓰지 말라고 명시하세요.

## 9. 오늘 체크리스트

- [ ] data/raw에 인허가 CSV (+ 가능하면 상가정보)
- [ ] .env에 Supabase·카카오·OpenAI·TourAPI 키
- [ ] Claude Code에 `docs/KICKOFF_PROMPT.md` 읽히기
- [ ] Supabase SQL 실행 (Claude Code가 요청할 때)
- [ ] Vercel 연결, 환경변수 입력, 카카오 도메인에 Vercel 주소 추가
- [ ] 폰으로 배포 주소 접속해서 지도·상세·챗봇·주문 카드 확인
- [ ] Figma 연결 (코드 동작 확인 후)
