// pipeline/config.py CUISINE_TAGS 와 같게 유지
export const TAG_EN: Record<string, string> = {
  국밥: 'Gukbap', 해장국: 'Haejangguk', '설렁탕·곰탕': 'Seolleongtang', 칼국수: 'Kalguksu', 냉면: 'Naengmyeon',
  국수: 'Noodles', 백반: 'Home-style set', 찌개: 'Stew', 고기구이: 'Korean BBQ', 갈비: 'Galbi',
  '곱창·막창': 'Gopchang', '족발·보쌈': 'Jokbal & Bossam', 닭요리: 'Chicken', '생선·해산물': 'Seafood', 횟집: 'Raw fish',
  장어: 'Eel', '전·부침': 'Jeon', 분식: 'Bunsik', 중식: 'Chinese', 일식: 'Japanese', 경양식: 'Western-style',
  '술집·포차': 'Pub', 호프: 'Beer hall', 기타: 'Other',
}

export const BIZ_EN: Record<string, string> = {
  한식: 'Korean', 중국식: 'Chinese', 일식: 'Japanese', 경양식: 'Western-style', 분식: 'Korean snack',
  '호프/통닭': 'Beer & chicken', '통닭(치킨)': 'Fried chicken', 까페: 'Cafe', 기타: 'Restaurant',
}

export const MENU_SOURCE: Record<string, { ko: string; en: string }> = {
  tourapi: { ko: '한국관광공사', en: 'Korea Tourism Organization' },
  model_restaurant: { ko: '마포구 모범음식점', en: 'Mapo-gu Model Restaurant list' },
  traditional: { ko: '인허가 전통업소', en: 'Traditional restaurant registry' },
}
