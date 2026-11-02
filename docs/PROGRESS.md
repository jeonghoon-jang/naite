# 진행 기록

## 결정사항
- 2026-11-02 Supabase는 팀장 소유 공용 프로젝트(Frankfurt). 새 테이블만 만들고 기존 객체 변경은 사전 확인. Vercel 함수 리전 `fra1`.
- 2026-11-02 `.env`의 `SUPABASE_URL`이 대시보드 주소였어서 `https://<ref>.supabase.co`로 수정.
- 2026-11-02 전처리에 업종 불일치·상가 미매칭 검사와 `docs/review.csv` 검수 시트 추가 (`keep=n` 숨김).

## 단계
- [x] Step 0 레포 정리
- [ ] Step 1 Supabase 스키마
- [ ] Step 2 데이터 파이프라인
- [ ] Step 3 웹 지도·상세 + 첫 배포
- [ ] Step 4 챗봇
- [ ] Step 5 부산집 메뉴·주문 카드
- [ ] Step 6 릴스·저장·영어
- [ ] Step 7 배포 마무리

## 옮긴 파일 (Step 0)
- `scripts/tourapi_hongdae_check.py` → `pipeline/01_tourapi.py`
- `scripts/build_nopo_candidates.py` → `pipeline/02_license_candidates.py`
- `data/interim/tourapi_hongdae.csv` → `data/interim/tourapi.csv`로 복사 (01 출력 이름, 원본 유지)

## 막힌 점 / 남은 일
- 부산집 영상 미도착 → 포스터+`예시 영상`으로 대체 중
