import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Circle, CustomOverlayMap, Map } from 'react-kakao-maps-sdk'
import { Link } from 'react-router'
import CategoryIcon, { CategoryArt } from '../components/CategoryIcon'
import HeartButton from '../components/HeartButton'
import LangToggle from '../components/LangToggle'
import StatusBadges from '../components/StatusBadges'
import StoreRow from '../components/StoreCard'
import { CATS, DECADES, catLabel, categoryOf, decadeOf, type Cat } from '../lib/category'
import { displayName, sinceYear, storeMeta, tagLabel, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { HONGDAE, RADIUS_M, useKakao } from '../lib/kakao'
import { EMPTY_FILTER, takePendingFilter, type MapFilter } from '../lib/mapFilter'
import { useSaved } from '../lib/saved'
import { fetchStores } from '../lib/supabase'
import type { StoreCard as S } from '../lib/types'

let lastFilter: MapFilter = EMPTY_FILTER // 상세 갔다 와도 유지
const CARD_STEP = 300 + 12 // 하단 카드 너비 + 간격

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-[14px] ${on ? 'bg-accent font-bold text-white' : 'border border-gray-200 bg-white font-medium text-gray-800'}`}
    >
      {children}
    </button>
  )
}

function Pin({ cat, selected, label }: { cat: Cat; selected: boolean; label: string }) {
  const sz = selected ? 46 : 34
  return (
    <div className="flex flex-col items-center">
      {selected && <span className="mb-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[12px] font-bold text-ink">{label}</span>}
      <span className="relative block" style={{ width: sz, height: sz * 1.22 }}>
        <svg viewBox="0 0 36 44" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M18 43s15-13.5 15-25A15 15 0 0 0 3 18c0 11.5 15 25 15 25Z" fill={selected ? 'var(--color-accent-dark)' : 'var(--color-accent)'} stroke="#fff" strokeWidth="2" />
        </svg>
        <span className="absolute inset-x-0 flex justify-center text-white" style={{ top: sz * 0.2 }}>
          <CategoryIcon cat={cat} size={sz * 0.5} strokeWidth={2.2} />
        </span>
      </span>
    </div>
  )
}

function MapCard({ s }: { s: S }) {
  const { t, lang } = useI18n()
  return (
    <Link to={`/s/${s.slug}`} className="press flex w-[300px] shrink-0 snap-center items-center gap-3.5 rounded-[22px] border border-gray-200 bg-white p-3.5">
      <CategoryArt cat={categoryOf(s)} className="size-[88px] shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="flex gap-1">
          <StatusBadges s={s} />
        </div>
        <div className="mt-0.5 truncate text-[18px] font-bold tracking-tight">{displayName(s, lang)}</div>
        <div className="text-[14px] font-bold text-accent">
          {t('since', { year: sinceYear(s.license_date) ?? '-' })} · {t('yearsN', { n: yearsInt(s.years_by_license) ?? '-' })}
        </div>
        <div className="truncate text-[12px] text-gray-500">{storeMeta(s, lang)}</div>
      </div>
      <HeartButton slug={s.slug} />
    </Link>
  )
}

export default function MapPage({ active }: { active: boolean }) {
  const { t, lang } = useI18n()
  const sdk = useKakao()
  const saved = useSaved()
  const [stores, setStores] = useState<S[] | null>(null)
  const [err, setErr] = useState(false)
  const [f, setF] = useState<MapFilter>(lastFilter)
  const [selected, setSelected] = useState<string | null>(null)
  const [map, setMap] = useState<kakao.maps.Map | null>(null)
  const cards = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<number>(0)

  useEffect(() => {
    fetchStores().then(setStores, () => setErr(true))
  }, [])
  useEffect(() => {
    if (!active) return
    const p = takePendingFilter() // 홈에서 칩·배너로 들어온 경우
    if (p) setF({ ...EMPTY_FILTER, ...p })
  }, [active])
  useEffect(() => {
    lastFilter = f
    cards.current?.scrollTo({ left: 0 })
  }, [f])

  const base = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return (stores ?? []).filter(
      (s) =>
        (!f.saved || saved.includes(s.slug)) &&
        (!f.model || s.is_model_restaurant) &&
        (s.years_by_license ?? 0) >= f.min &&
        (!f.decade || decadeOf(s.license_date) === f.decade) &&
        (!q ||
          [s.name, s.name_en, s.dong, catLabel(categoryOf(s), lang), ...s.cuisine_tags.map((x) => tagLabel(x, lang))].some((v) =>
            v?.toLowerCase().includes(q),
          )),
    )
  }, [stores, f.saved, f.model, f.min, f.decade, f.q, saved, lang])

  const counts = useMemo(() => {
    const m = new globalThis.Map<Cat, number>()
    base.forEach((s) => m.set(categoryOf(s), (m.get(categoryOf(s)) ?? 0) + 1))
    return m
  }, [base])

  const shown = useMemo(() => {
    const xs = base.filter((s) => !f.cat || categoryOf(s) === f.cat)
    return f.sort === 'near'
      ? xs.sort((a, b) => (a.dist_m ?? 1e9) - (b.dist_m ?? 1e9))
      : xs.sort((a, b) => (a.license_date ?? '9').localeCompare(b.license_date ?? '9'))
  }, [base, f.cat, f.sort])

  const set = (p: Partial<MapFilter>) => setF((x) => ({ ...x, ...p }))

  // 핀을 누르면 하단 카드를 그 가게로, 카드를 넘기면 지도를 그 가게로
  const selectPin = (slug: string) => {
    setSelected(slug)
    const i = shown.findIndex((s) => s.slug === slug)
    cards.current?.scrollTo({ left: i * CARD_STEP, behavior: 'smooth' })
  }
  const onCardsScroll = () => {
    clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      const el = cards.current
      if (!el) return
      const s = shown[Math.round(el.scrollLeft / CARD_STEP)]
      if (!s) return
      setSelected(s.slug)
      map?.panTo(new kakao.maps.LatLng(s.lat, s.lng))
    }, 140)
  }

  const isList = f.view === 'list'

  return (
    <div className="relative h-full overflow-hidden bg-gray-100">
      {/* isolate: 카카오 지도 내부 레이어의 z-index 가 목록 화면 위로 올라오지 않게 가둔다 */}
      <div data-noswipe className="absolute inset-0 isolate">
        {!sdk.loading && !sdk.error && (
          <Map center={HONGDAE} level={5} className="h-full w-full" onCreate={setMap}>
            <Circle center={HONGDAE} radius={RADIUS_M} strokeWeight={1.5} strokeColor="#b8581f" strokeOpacity={0.5} strokeStyle="dash" fillColor="#b8581f" fillOpacity={0.03} />
            {shown.map((s) => (
              <CustomOverlayMap key={s.slug} position={{ lat: s.lat, lng: s.lng }} yAnchor={1} zIndex={selected === s.slug ? 10 : 1} clickable>
                <button onClick={() => selectPin(s.slug)} aria-label={s.name}>
                  <Pin cat={categoryOf(s)} selected={selected === s.slug} label={displayName(s, lang)} />
                </button>
              </CustomOverlayMap>
            ))}
          </Map>
        )}
        {sdk.error && <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('error')}</div>}
      </div>

      {isList && (
        <div className="absolute inset-0 overflow-y-auto bg-white pb-24 pt-[128px]">
          <div className="flex items-center justify-between px-5 pb-1 pt-3">
            <span className="text-[15px] font-bold">{t('list.count', { n: shown.length })}</span>
            <div className="flex gap-3 text-[14px]">
              {(['old', 'near'] as const).map((k) => (
                <button key={k} onClick={() => set({ sort: k })} className={f.sort === k ? 'font-bold text-ink' : 'font-medium text-gray-400'}>
                  {t(k === 'old' ? 'sort.old' : 'sort.near')}
                </button>
              ))}
            </div>
          </div>
          {shown.length === 0 && <p className="p-8 text-center text-sm text-gray-500">{f.saved ? t('list.emptySaved') : t('list.empty')}</p>}
          <ul>
            {shown.map((s) => (
              <li key={s.slug}>
                <StoreRow s={s} />
              </li>
            ))}
          </ul>
          <p className="px-5 py-4 text-[11px] leading-4 text-gray-400">
            {lang === 'ko'
              ? '출처: 서울특별시 마포구 일반음식점 인허가 정보, 소상공인시장진흥공단 상가(상권)정보 외. 업력은 인허가 기준이며 실제와 다를 수 있어요.'
              : 'Sources: Mapo-gu restaurant license data (Seoul), SEMAS commercial district data, and others. Years are based on business licenses.'}
          </p>
        </div>
      )}

      <div className={`absolute inset-x-0 top-0 z-10 space-y-2.5 pb-3 pt-3 ${isList ? 'border-b border-gray-100 bg-white' : ''}`}>
        <div className="flex items-center gap-2 px-4">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-gray-500">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder={t('map.search')}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-500"
            />
            {f.q && (
              <button onClick={() => set({ q: '' })} aria-label="clear" className="text-gray-400">
                ✕
              </button>
            )}
          </label>
          <LangToggle />
        </div>
        <div data-noswipe className="no-scrollbar flex gap-1.5 overflow-x-auto px-4">
          <Chip on={!f.cat && !f.saved && !f.decade && !f.model && !f.min} onClick={() => setF({ ...EMPTY_FILTER, view: f.view, q: f.q, sort: f.sort })}>
            {t('filter.all')}
          </Chip>
          <Chip on={f.saved} onClick={() => set({ saved: !f.saved })}>
            {t('filter.saved')}
            {saved.length ? ` ${saved.length}` : ''}
          </Chip>
          {f.model && <Chip on onClick={() => set({ model: false })}>{t('badge.model')} ✕</Chip>}
          {f.min > 0 && <Chip on onClick={() => set({ min: 0 })}>{t('filter.40')} ✕</Chip>}
          {DECADES.map((d) => (
            <Chip key={d} on={f.decade === d} onClick={() => set({ decade: f.decade === d ? null : d })}>
              {t('decade', { d })}
            </Chip>
          ))}
          {CATS.filter((c) => counts.get(c) || f.cat === c).map((c) => (
            <Chip key={c} on={f.cat === c} onClick={() => set({ cat: f.cat === c ? null : c })}>
              <CategoryIcon cat={c} size={17} className={f.cat === c ? '' : 'text-accent'} />
              {catLabel(c, lang)}
              <span className={`text-[12px] ${f.cat === c ? 'text-white/80' : 'text-gray-400'}`}>{counts.get(c) ?? 0}</span>
            </Chip>
          ))}
        </div>
      </div>

      {err && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-gray-500">{t('error')}</p>}

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-3">
        <button
          onClick={() => set({ view: isList ? 'map' : 'list' })}
          className="press pointer-events-auto flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[14px] font-bold text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {isList ? <path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2ZM9 4.5v13M15 6.5v13" /> : <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />}
          </svg>
          {isList ? t('map.map') : t('map.list')}
        </button>
        {!isList && stores && shown.length === 0 && (
          <p className="pointer-events-auto mx-4 w-[calc(100%-32px)] rounded-[22px] border border-gray-200 bg-white px-5 py-5 text-center text-[14px] break-keep text-gray-600">
            {f.saved ? t('list.emptySaved') : t('list.empty')}
          </p>
        )}
        {!isList && shown.length > 0 && (
          <div
            ref={cards}
            data-noswipe
            onScroll={onCardsScroll}
            className="no-scrollbar pointer-events-auto flex w-full snap-x snap-mandatory gap-3 overflow-x-auto px-[calc(50%-150px)]"
          >
            {shown.map((s) => (
              <MapCard key={s.slug} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
