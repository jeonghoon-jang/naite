# 진행 기록

## 결정사항
- 2026-11-02 Supabase는 팀장 소유 공용 프로젝트(Frankfurt). 새 테이블만 만들고 기존 객체 변경은 사전 확인. Vercel 함수 리전 `fra1`.
- 2026-11-02 `.env`의 `SUPABASE_URL`이 대시보드 주소였어서 `https://<ref>.supabase.co`로 수정.
- 2026-11-02 내비게이션: 하단 탭 3개(지도/릴스/AI 챗봇) + 좌우 스와이프. 저장 탭 대신 지도의 `저장됨` 칩과 카드 하트. `/saved` 없음.
- 2026-11-02 부산집은 가상 좌표 대신 실제 인허가 레코드(`3130000-101-1985-08174`, 월드컵북로 18, 1985)에 slug `busanjip`를 붙이고 사진·메뉴·릴스만 예시로 붙임 (사용자 확인 필요).
- 2026-11-02 대표메뉴·요약은 LLM 대신 코드 템플릿(출처 추적, 환각 0). LLM은 태그·영문명·프랜차이즈 판정만, 태그는 근거 키워드로 재검증.
- 2026-11-02 챗봇: Planner와 질문 임베딩을 병렬 호출, match_stores가 카드 필드를 돌려줘 DB 재조회 없음, anon 키 + RPC(서비스 키는 파이프라인 전용).
- 2026-11-02 전처리에 업종 불일치·상가 미매칭 검사와 `docs/review.csv` 검수 시트 추가 (`keep=n` 숨김).

## 단계
- [x] Step 0 레포 정리
- [x] Step 1 Supabase 스키마 (SQL Editor 실행, 테이블 4개 + match_stores 확인)
- [x] Step 2 데이터 파이프라인 (149곳 적재, 공개 119/숨김 30, 임베딩 null 0, 프랜차이즈 의심 27)
- [ ] Step 3 웹 지도·상세 + 첫 배포
- [ ] Step 4 챗봇
- [ ] Step 5 부산집 메뉴·주문 카드
- [ ] Step 6 릴스·저장·영어
- [ ] Step 7 배포 마무리

## 챗봇 평가 (2026-11-02, 로컬, gpt-5.4-mini)
- 범위 정확도 32/32 (100%), 태그 적중 10/10, 평균 2.1초
- 수정: 카카오 지역 판정에서 '쪽/근처' 접미어 제거 + 상위 5개 중 최근접 기준, Planner에 '타 지역 맛집 질문도 recommend' 규칙 추가
- 관찰: '상수동 경양식집' 결과에 지금은 주점으로 보이는 곳이 섞임 → 인허가 업태가 오래된 경우. review.csv 검수로 정리 필요

## 옮긴 파일 (Step 0)
- `scripts/tourapi_hongdae_check.py` → `pipeline/01_tourapi.py`
- `scripts/build_nopo_candidates.py` → `pipeline/02_license_candidates.py`
- `data/interim/tourapi_hongdae.csv` → `data/interim/tourapi.csv`로 복사 (01 출력 이름, 원본 유지)

## 막힌 점 / 남은 일
- 부산집 영상 미도착 → 포스터+`예시 영상`으로 대체 중
