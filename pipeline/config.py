"""파이프라인 공통 설정·유틸. 값은 루트 .env 에서 읽는다."""
import math
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RAW = os.path.join(ROOT, "data", "raw")
INTERIM = os.path.join(ROOT, "data", "interim")
PROCESSED = os.path.join(ROOT, "data", "processed")
REVIEW_CSV = os.path.join(ROOT, "docs", "review.csv")


def load_dotenv():
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                v = v.split(" #", 1)[0]
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_dotenv()

CENTER = (37.5572, 126.9245)  # 홍대입구역 (위도, 경도)
RADIUS_M = int(os.environ.get("RADIUS_M", "1800"))
MIN_YEARS = int(os.environ.get("MIN_YEARS", "30"))
SRC_EPSG = os.environ.get("SRC_EPSG", "5174")

OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-5.4-mini")
OPENAI_EMBED_MODEL = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")

# 통제 어휘 (web/src/lib/tags.ts, web/api/_lib 와 같게 유지)
CUISINE_TAGS = [
    "국밥", "해장국", "설렁탕·곰탕", "칼국수", "냉면", "국수", "백반", "찌개", "고기구이", "갈비",
    "곱창·막창", "족발·보쌈", "닭요리", "생선·해산물", "횟집", "장어", "전·부침", "분식", "중식",
    "일식", "경양식", "술집·포차", "호프", "기타",
]

SRC_LICENSE = {"name": "서울특별시 마포구 일반음식점 인허가 정보", "url": "https://data.seoul.go.kr", "license": "공공누리 1유형"}
SRC_SANGGA = {"name": "소상공인시장진흥공단 상가(상권)정보", "url": "https://www.data.go.kr", "license": "공공누리 1유형"}
SRC_TOUR = {"name": "한국관광공사 국문 관광정보 서비스(TourAPI)", "url": "https://api.visitkorea.or.kr", "license": "공공누리(항목별 유형)"}
SRC_BAEKNYEON = {"name": "중소벤처기업부 백년가게 지정 리스트", "url": "https://www.data.go.kr", "license": "공공누리 1유형"}
SRC_MODEL = {"name": "서울특별시 마포구 모범음식점 지정 현황", "url": "https://data.seoul.go.kr", "license": "공공누리 1유형"}


def need_env(*names):
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        sys.exit(f"루트 .env 에 {', '.join(missing)} 가 필요해요.")
    return [os.environ[n] for n in names]


def haversine(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def norm_name(s):
    s = re.sub(r"\(.*?\)|\[.*?\]", "", str(s))
    s = re.sub(r"(본점|직영점|\d+호점|주식회사|\(주\)|㈜)", "", s)
    return re.sub(r"[^가-힣A-Za-z0-9]", "", s).lower()


def read_csv_any(path, **kw):
    import pandas as pd

    for enc in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False, **kw)
        except UnicodeDecodeError:
            continue
    sys.exit(f"인코딩을 읽을 수 없어요: {path}")
