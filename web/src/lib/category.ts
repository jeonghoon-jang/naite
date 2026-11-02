import type { Lang } from './i18n'

/** 화면에서 가게를 구분하는 업종 10종. 가게마다 하나로 정한다. */
export const CATS = ['한식', '고기', '닭', '양식', '중식', '국수', '분식', '술집', '일식', '장어'] as const
export type Cat = (typeof CATS)[number]

const CAT_EN: Record<Cat, string> = {
  한식: 'Korean', 고기: 'BBQ', 닭: 'Chicken', 양식: 'Western', 중식: 'Chinese',
  국수: 'Noodles', 분식: 'Snacks', 술집: 'Pub', 일식: 'Japanese', 장어: 'Eel',
}

export const catLabel = (c: Cat, lang: Lang) => (lang === 'en' ? CAT_EN[c] : c === '술집' ? '술집·호프' : c)

/** cuisine_tags·biz_type 으로 업종 하나를 고른다. 위에 있는 규칙이 먼저 (구체적인 음식 → 넓은 분류). */
export function categoryOf(s: { cuisine_tags: string[] | null; biz_type: string | null }): Cat {
  const t = new Set(s.cuisine_tags ?? [])
  const b = s.biz_type ?? ''
  const has = (...xs: string[]) => xs.some((x) => t.has(x))
  if (has('장어')) return '장어'
  if (has('국수', '칼국수', '냉면')) return '국수'
  if (has('닭요리') || b.includes('통닭')) return '닭'
  if (has('고기구이', '갈비', '곱창·막창', '족발·보쌈')) return '고기'
  if (has('호프', '술집·포차') || b === '호프/통닭') return '술집'
  if (has('분식') || b === '분식') return '분식'
  if (has('일식', '횟집') || b === '일식') return '일식'
  if (has('중식') || b === '중국식') return '중식'
  if (has('경양식') || b === '경양식') return '양식'
  return '한식'
}

export const DECADES = [1970, 1980, 1990] as const
export type Decade = (typeof DECADES)[number]
export const decadeOf = (licenseDate: string | null) => (licenseDate ? Math.floor(Number(licenseDate.slice(0, 4)) / 10) * 10 : null)
