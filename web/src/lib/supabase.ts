import { createClient } from '@supabase/supabase-js'
import type { Menu, OrderPhrase, Reel, StoreCard, StoreDetail } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supabase = createClient(url, key, { auth: { persistSession: false } })

export const CARD_COLS =
  'id,slug,name,name_en,lat,lng,address,dong,dist_m,license_date,years_by_license,biz_type,cuisine_tags,menu_main,menu_source,is_baeknyeon,is_model_restaurant,data_status,summary_ko,summary_en,kakao_place_url,photo_url'

// 화면 간 이동에서 같은 요청을 반복하지 않도록 메모리 캐시 (요청 1회 = Promise 1개)
const cache = new Map<string, Promise<unknown>>()
function once<T>(k: string, f: () => Promise<T>): Promise<T> {
  if (!cache.has(k)) cache.set(k, f().catch((e) => { cache.delete(k); throw e }))
  return cache.get(k) as Promise<T>
}

function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

/** 지도·목록: 공개 매장 전체를 한 번에 */
export const fetchStores = () =>
  once('stores', async () =>
    unwrap<StoreCard[]>(await supabase.from('stores').select(CARD_COLS).order('years_by_license', { ascending: false })),
  )

/** 상세: 매장 + 출처 + 메뉴 유무를 한 요청으로 */
export const fetchStore = (slug: string) =>
  once(`store:${slug}`, async () =>
    unwrap<StoreDetail | null>(
      await supabase.from('stores').select(`${CARD_COLS},photo_credit,sources,menus(id)`).eq('slug', slug).maybeSingle(),
    ),
  )

/** 메뉴·주문 카드: 매장 + 메뉴 + 주문 문구를 한 요청으로 */
export const fetchMenu = (slug: string) =>
  once(`menu:${slug}`, async () =>
    unwrap<(Pick<StoreCard, 'id' | 'slug' | 'name' | 'name_en' | 'address' | 'data_status'> & { menus: Menu[]; order_phrases: OrderPhrase[] }) | null>(
      await supabase
        .from('stores')
        .select('id,slug,name,name_en,address,data_status,menus(*),order_phrases(*)')
        .eq('slug', slug)
        .order('sort', { referencedTable: 'menus' })
        .order('sort', { referencedTable: 'order_phrases' })
        .maybeSingle(),
    ),
  )

/** 릴스: 릴스 + 매장 요약을 한 요청으로 */
export const fetchReels = () =>
  once('reels', async () =>
    unwrap<Reel[]>(
      await supabase
        .from('reels')
        .select('id,sort,video_url,poster_url,caption_ko,caption_en,is_mock,stores!inner(slug,name,name_en,license_date,years_by_license,cuisine_tags,biz_type)')
        .order('sort'),
    ),
  )
