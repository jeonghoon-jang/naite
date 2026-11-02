export type Source = { name: string; url?: string; license?: string; fetched_at?: string; note?: string }

export type StoreCard = {
  id: string
  slug: string
  name: string
  name_en: string | null
  lat: number
  lng: number
  address: string | null
  dong: string | null
  dist_m: number | null
  license_date: string | null
  years_by_license: number | null
  biz_type: string | null
  cuisine_tags: string[]
  menu_main: string | null
  menu_source: string | null
  is_baeknyeon: boolean
  is_model_restaurant?: boolean
  data_status: 'mock' | 'candidate' | 'verified'
  summary_ko: string | null
  summary_en: string | null
  kakao_place_url: string | null
  photo_url: string | null
}

export type StoreDetail = StoreCard & {
  photo_credit: string | null
  is_model_restaurant: boolean
  sources: Source[]
  menus: { id: string }[]
}

export type Menu = {
  id: string
  sort: number
  name_ko: string
  name_en: string
  desc_ko: string | null
  desc_en: string | null
  price: number | null
  unit_ko: string | null
  unit_en: string | null
  min_qty: number
  is_mock: boolean
}

export type OrderPhrase = { id: string; sort: number; text_ko: string; text_en: string }

export type Reel = {
  id: string
  sort: number
  video_url: string | null
  poster_url: string | null
  caption_ko: string | null
  caption_en: string | null
  is_mock: boolean
  stores: Pick<StoreCard, 'slug' | 'name' | 'name_en' | 'license_date' | 'years_by_license' | 'cuisine_tags' | 'biz_type'>
}
