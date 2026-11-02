# 데이터 출처·라이선스·컬럼 매핑

| 데이터 | 파일 | 출처 | 라이선스 | 화면 표시 문구 |
| --- | --- | --- | --- | --- |
| 마포구 일반음식점 인허가 | `data/raw/mapo_restaurants.csv` (cp949) | 서울 열린데이터광장 | 공공누리 1유형 | 서울특별시 마포구 일반음식점 인허가 정보 |
| 소상공인 상가(상권)정보 서울 | `data/raw/sangga_seoul.csv` (utf-8, 약 300MB) | data.go.kr | 공공누리 1유형 | 소상공인시장진흥공단 상가(상권)정보 |
| 백년가게 지정 리스트 | `data/raw/baeknyeon.csv` (cp949) | data.go.kr | 공공누리 1유형 | 중소벤처기업부 백년가게 |
| 마포구 모범음식점 | `data/raw/model_restaurant.csv` (cp949) | 서울 열린데이터광장 | 공공누리 1유형 | 마포구 모범음식점 지정 현황 |
| TourAPI 음식점 | `data/interim/tourapi.csv` | 한국관광공사 KorService2 | 사진은 항목별 공공누리 유형 | 사진: 한국관광공사 |
| 카카오 장소 | `stores.kakao_place_id/url`만 | 카카오 로컬 API | 응답 저장 금지(ID·URL만 허용) | 카카오맵에서 보기 |

## 컬럼 매핑 → `stores`

| stores | 인허가 | 상가정보 | 기타 |
| --- | --- | --- | --- |
| slug | `관리번호` → `mapo-<연도>-<일련번호>` | | 부산집 `busanjip` |
| name | 사업장명 | | |
| lat/lng | 좌표정보(X,Y) EPSG:5174 → WGS84 | | |
| address | 도로명주소 (없으면 지번주소) | | |
| dong | 도로명주소 괄호 안 법정동 | 법정동명 | |
| license_date, years_by_license | 인허가일자 | | |
| biz_type | 업태구분명 | | |
| sangga_* (검수용) | | 상호명, 지점명, 업종 대·중·소분류 | |
| menu_main / menu_source | 전통업소주된음식(`traditional`) | | 모범음식점 주된음식(`model_restaurant`), TourAPI firstmenu(`tourapi`) |
| is_baeknyeon | | | 백년가게 업체명 + 주소(서울 마포구) 일치 |

## 검사 플래그 (03 단계)

- `sangga_unmatched`: 상가정보에서 이름 유사 + 60m 이내 업소를 못 찾음 → 폐업·상호 변경 가능성
- `type_mismatch`: 인허가 업태와 상가정보 업종이 크게 다름 (예: 인허가 한식 ↔ 상가 카페) → 업종 전환 가능성
- `franchise_suspect`: 브랜드 키워드, 상가 지점명, LLM 판정 중 하나라도 해당

플래그는 `docs/review.csv`에 모인다. `keep` 열에 `n`을 쓰면 숨기고, `y`를 쓰면 자동 숨김 규칙(프랜차이즈 의심)을 무시하고 보인다.
