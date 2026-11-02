import type { Lang } from './i18n'
import { BIZ_EN, TAG_EN } from './tags'

export const sinceYear = (d: string | null) => (d ? Number(d.slice(0, 4)) : null)
export const yearsInt = (y: number | null) => (y == null ? null : Math.floor(y))

export const displayName = (s: { name: string; name_en: string | null }, lang: Lang) =>
  lang === 'en' && s.name_en ? s.name_en : s.name

export const tagLabel = (tag: string, lang: Lang) => (lang === 'en' ? TAG_EN[tag] ?? tag : tag)
export const bizLabel = (biz: string | null, lang: Lang) => (biz ? (lang === 'en' ? BIZ_EN[biz] ?? biz : biz) : '')

export const won = (n: number | null) => (n == null ? '' : `${n.toLocaleString('ko-KR')}원`)

export const kakaoMapLink = (s: { name: string; lat: number; lng: number; kakao_place_url: string | null }) =>
  s.kakao_place_url?.replace('http://', 'https://') ?? `https://map.kakao.com/link/map/${encodeURIComponent(s.name)},${s.lat},${s.lng}`
export const kakaoDirections = (s: { name: string; lat: number; lng: number }) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`
