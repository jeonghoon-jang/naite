import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CustomOverlayMap, Map } from 'react-kakao-maps-sdk'
import LangToggle from '../components/LangToggle'
import NaiteRing from '../components/NaiteRing'
import StoreCard from '../components/StoreCard'
import { tagLabel } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { HONGDAE, RADIUS_M, useKakao } from '../lib/kakao'
import { useSaved } from '../lib/saved'
import { fetchStores } from '../lib/supabase'
import type { StoreCard as S } from '../lib/types'

type Filter = { saved: boolean; min: 0 | 30 | 40; baeknyeon: boolean; tag: string | null }
let lastFilter: Filter = { saved: false, min: 0, baeknyeon: false, tag: null } // 상세 갔다 와도 유지

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`shrink-0 rounded-full border px-3 py-1 text-[13px] ${on ? 'border-accent bg-accent text-white' : 'border-neutral-300 bg-white text-neutral-700'}`}
    >
      {children}
    </button>
  )
}

export default function MapPage() {
  const { t, lang } = useI18n()
  const kakao = useKakao()
  const saved = useSaved()
  const [stores, setStores] = useState<S[] | null>(null)
  const [err, setErr] = useState(false)
  const [f, setF] = useState<Filter>(lastFilter)
  const [selected, setSelected] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStores().then(setStores, () => setErr(true))
  }, [])
  useEffect(() => {
    lastFilter = f
  }, [f])

  const tagCounts = useMemo(() => {
    const m = new globalThis.Map<string, number>()
    stores?.forEach((s) => s.cuisine_tags.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)))
    return [...m.entries()].filter(([x]) => x !== '기타').sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [stores])
  const hasBaeknyeon = stores?.some((s) => s.is_baeknyeon)

  const shown = useMemo(
    () =>
      (stores ?? []).filter(
        (s) =>
          (!f.saved || saved.includes(s.slug)) &&
          (s.years_by_license ?? 0) >= f.min &&
          (!f.baeknyeon || s.is_baeknyeon) &&
          (!f.tag || s.cuisine_tags.includes(f.tag)),
      ),
    [stores, f, saved],
  )

  const select = (slug: string) => {
    setSelected(slug)
    // scrollIntoView 대신 목록 컨테이너만 스크롤 (탭 틀이 가로로 밀리지 않게)
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-slug="${slug}"]`)
    if (list && item) list.scrollTo({ top: item.offsetTop - 8, behavior: 'smooth' })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight">{lang === 'ko' ? '나이테' : 'NAITE'}</span>
          <span className="text-xs text-neutral-500">{t('app.tagline')}</span>
        </div>
        <LangToggle />
      </header>

      <div data-noswipe className="relative h-[40%] shrink-0 bg-neutral-100">
        {!kakao.loading && !kakao.error && (
          <Map center={HONGDAE} level={6} className="h-full w-full" isPanto>
            <Circle center={HONGDAE} radius={RADIUS_M} strokeWeight={1.5} strokeColor="#b5541c" strokeOpacity={0.7} fillColor="#b5541c" fillOpacity={0.04} />
            {shown.map((s) => (
              <CustomOverlayMap key={s.slug} position={{ lat: s.lat, lng: s.lng }} zIndex={selected === s.slug ? 10 : 1}>
                <button onClick={() => select(s.slug)} className={`block rounded-full ${selected === s.slug ? 'ring-2 ring-accent' : ''}`} aria-label={s.name}>
                  <NaiteRing years={s.years_by_license} size={selected === s.slug ? 40 : 30} />
                </button>
              </CustomOverlayMap>
            ))}
          </Map>
        )}
        {kakao.error && <div className="flex h-full items-center justify-center text-sm text-neutral-500">{t('error')}</div>}
      </div>

      <div data-noswipe className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-neutral-200 px-4 py-2">
        <Chip on={f.saved} onClick={() => setF({ ...f, saved: !f.saved })}>
          {t('filter.saved')}
          {saved.length ? ` ${saved.length}` : ''}
        </Chip>
        <Chip on={f.min === 30} onClick={() => setF({ ...f, min: f.min === 30 ? 0 : 30 })}>{t('filter.30')}</Chip>
        <Chip on={f.min === 40} onClick={() => setF({ ...f, min: f.min === 40 ? 0 : 40 })}>{t('filter.40')}</Chip>
        {hasBaeknyeon && (
          <Chip on={f.baeknyeon} onClick={() => setF({ ...f, baeknyeon: !f.baeknyeon })}>{t('filter.baeknyeon')}</Chip>
        )}
        {tagCounts.map(([tag]) => (
          <Chip key={tag} on={f.tag === tag} onClick={() => setF({ ...f, tag: f.tag === tag ? null : tag })}>
            {tagLabel(tag, lang)}
          </Chip>
        ))}
      </div>

      <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto">
        {err && <p className="p-6 text-center text-sm text-neutral-500">{t('error')}</p>}
        {!stores && !err && <p className="p-6 text-center text-sm text-neutral-500">{t('loading')}</p>}
        {stores && (
          <>
            <div className="px-4 pt-2 text-xs text-neutral-500">{t('list.count', { n: shown.length })}</div>
            {shown.length === 0 && <p className="p-6 text-center text-sm text-neutral-500">{f.saved ? t('list.emptySaved') : t('list.empty')}</p>}
            <ul className="divide-y divide-neutral-100">
              {shown.map((s) => (
                <li key={s.slug} data-slug={s.slug}>
                  <StoreCard s={s} active={selected === s.slug} />
                </li>
              ))}
            </ul>
            <p className="px-4 py-4 text-[11px] leading-4 text-neutral-400">
              {lang === 'ko'
                ? '출처: 서울특별시 마포구 일반음식점 인허가 정보, 소상공인시장진흥공단 상가(상권)정보 외. 업력은 인허가 기준이며 실제와 다를 수 있어요.'
                : 'Sources: Mapo-gu restaurant license data (Seoul), SEMAS commercial district data, and others. Years are based on business licenses.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
