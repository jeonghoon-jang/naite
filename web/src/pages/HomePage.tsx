import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import CategoryIcon, { CategoryArt } from '../components/CategoryIcon'
import LangToggle from '../components/LangToggle'
import Logo from '../components/Logo'
import StoreRow, { StoreTile } from '../components/StoreCard'
import { CATS, DECADES, catLabel, categoryOf, decadeOf, type Cat, type Decade } from '../lib/category'
import { displayName, sinceYear, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { setPendingFilter, type MapFilter } from '../lib/mapFilter'
import { useSaved } from '../lib/saved'
import { fetchStores } from '../lib/supabase'
import type { StoreCard as S } from '../lib/types'

type Banner = { key: string; eyebrow: string; title: string; sub: string; cat: Cat; dark?: boolean; to: string | Partial<MapFilter> }

/** 배너 문구는 전부 실제 데이터에서 만든다(인허가 기준). 부산집 메뉴만 '예시'. */
function useBanners(stores: S[] | null, lang: 'ko' | 'en'): Banner[] {
  return useMemo(() => {
    if (!stores?.length) return []
    const ko = lang === 'ko'
    const out: Banner[] = []
    const oldest = [...stores].sort((a, b) => (a.license_date ?? '9').localeCompare(b.license_date ?? '9'))[0]
    if (oldest) {
      const y = yearsInt(oldest.years_by_license)
      out.push({
        key: 'oldest',
        eyebrow: ko ? '가장 오래된 가게' : 'The oldest',
        title: ko ? `${y}년째 문을 연\n${oldest.dong ?? ''} ${oldest.name}` : `${displayName(oldest, lang)}:\nopen for ${y} years`,
        sub: ko ? `인허가 기준 ${sinceYear(oldest.license_date)}년부터.\n공개된 ${stores.length}곳 중 가장 오래됐어요` : `Licensed in ${sinceYear(oldest.license_date)}.\nThe oldest of ${stores.length} places`,
        cat: categoryOf(oldest),
        dark: true,
        to: `/s/${oldest.slug}`,
      })
    }
    const over40 = stores.filter((s) => (s.years_by_license ?? 0) >= 40)
    if (over40.length) {
      const top = [...over40].sort((a, b) => (b.years_by_license ?? 0) - (a.years_by_license ?? 0)).slice(0, 2)
      out.push({
        key: 'over40',
        eyebrow: ko ? '40년 이상' : '40+ years',
        title: ko ? `40년 넘게 이어온\n가게 ${over40.length}곳` : `${over40.length} places\nopen 40+ years`,
        sub: top.map((s) => `${sinceYear(s.license_date)} ${displayName(s, lang)}`).join(' · '),
        cat: categoryOf(top[0]),
        to: { min: 40, view: 'list', sort: 'old' },
      })
    }
    const model = stores.filter((s) => s.is_model_restaurant)
    if (model.length) {
      out.push({
        key: 'model',
        eyebrow: ko ? '모범음식점' : 'Model restaurants',
        title: ko ? `마포구 모범음식점\n${model.length}곳` : `${model.length} Mapo-gu\nmodel restaurants`,
        sub: ko ? '마포구 모범음식점 목록에 있는 가게예요' : 'Listed by Mapo-gu as model restaurants',
        cat: categoryOf(model[0]),
        to: { model: true, view: 'list' },
      })
    }
    const busan = stores.find((s) => s.slug === 'busanjip')
    if (busan) {
      out.push({
        key: 'menu',
        eyebrow: ko ? '예시 · 영어 메뉴' : 'Sample · English menu',
        title: ko ? '외국인 손님도\n주문 카드로 편하게' : 'Order with\na card to show',
        sub: ko ? `${busan.name} 영어 메뉴·주문 카드 예시` : `${displayName(busan, lang)} English menu sample`,
        cat: categoryOf(busan),
        to: `/s/${busan.slug}/menu`,
      })
    }
    return out
  }, [stores, lang])
}

function BannerCarousel({ banners, active }: { banners: Banner[]; active: boolean }) {
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const holdUntil = useRef(0)

  // 5초마다 다음 배너. 손을 대면 8초 쉰다. 탭이 안 보일 때는 멈춘다.
  useEffect(() => {
    if (!active || banners.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const el = ref.current
      if (!el || Date.now() < holdUntil.current) return
      const next = (i + 1) % banners.length
      el.scrollTo({ left: (el.children[next] as HTMLElement).offsetLeft - 20, behavior: 'smooth' })
    }, 5000)
    return () => clearInterval(id)
  }, [active, banners.length, i])

  const go = (b: Banner) => {
    if (typeof b.to === 'string') nav(b.to)
    else {
      setPendingFilter(b.to)
      nav('/map', { replace: true })
    }
  }

  return (
    <div
      ref={ref}
      data-noswipe
      onPointerDown={() => (holdUntil.current = Date.now() + 8000)}
      onScroll={(e) => {
        const el = e.currentTarget
        const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1
        setI(Math.round(el.scrollLeft / (w + 12)))
      }}
      className="no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pt-4"
    >
      {banners.map((b, k) => (
        <button
          key={b.key}
          onClick={() => go(b)}
          className={`press relative h-[260px] w-[calc(100%-40px)] shrink-0 snap-start overflow-hidden rounded-3xl text-left ${b.dark ? 'bg-accent-dark' : 'bg-accent-50'}`}
        >
          <span className="absolute -bottom-12 -right-14 size-64">
            <CategoryArt cat={b.cat} dark={b.dark} className="size-full rounded-full !bg-transparent" />
          </span>
          <div className="relative flex h-full flex-col p-6">
            <span className={`self-start rounded-md px-2 py-0.5 text-[11px] font-bold ${b.dark ? 'bg-accent text-white' : 'bg-white text-accent'}`}>{b.eyebrow}</span>
            <h2 className={`mt-2.5 whitespace-pre-line text-[25px] font-black leading-[1.3] tracking-tight ${b.dark ? 'text-white' : 'text-ink'}`}>{b.title}</h2>
            <p className={`mt-2 max-w-[200px] whitespace-pre-line text-[13px] font-medium leading-5 ${b.dark ? 'text-[#e6d3c5]' : 'text-gray-700'}`}>{b.sub}</p>
          </div>
          <span className="absolute bottom-4 right-4 rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-medium text-white">
            {k + 1} / {banners.length}
          </span>
        </button>
      ))}
      <span className="sr-only" aria-live="polite">{i + 1}</span>
    </div>
  )
}

function Section({ kicker, title, more, children }: { kicker?: string; title: string; more?: () => void; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section className="py-6">
      <div className="flex items-end justify-between px-5 pb-3">
        <div>
          {kicker && <div className="text-[14px] font-medium text-gray-600">{kicker}</div>}
          <h3 className="text-[21px] font-bold tracking-tight">{title}</h3>
        </div>
        {more && (
          <button onClick={more} className="flex items-center text-[13px] font-medium text-gray-500">
            {t('home.more')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 5 7 7-7 7" /></svg>
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

const Gap = () => <div className="h-2.5 bg-gray-100" />

export default function HomePage({ active }: { active: boolean }) {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const saved = useSaved()
  const [stores, setStores] = useState<S[] | null>(null)
  const [err, setErr] = useState(false)
  const [decade, setDecade] = useState<Decade | null>(null)

  useEffect(() => {
    fetchStores().then(setStores, () => setErr(true))
  }, [])

  const banners = useBanners(stores, lang)
  const inDecade = useMemo(() => (stores ?? []).filter((s) => !decade || decadeOf(s.license_date) === decade), [stores, decade])
  const counts = useMemo(() => {
    const m = new Map<Cat, number>()
    inDecade.forEach((s) => m.set(categoryOf(s), (m.get(categoryOf(s)) ?? 0) + 1))
    return m
  }, [inDecade])
  const near = useMemo(() => [...inDecade].filter((s) => s.dist_m != null).sort((a, b) => a.dist_m! - b.dist_m!).slice(0, 10), [inDecade])
  const oldest = useMemo(() => [...inDecade].sort((a, b) => (a.license_date ?? '9').localeCompare(b.license_date ?? '9')).slice(0, 5), [inDecade])

  const openMap = (f: Partial<MapFilter>) => {
    setPendingFilter({ decade, ...f })
    nav('/map', { replace: true })
  }

  const tabs: [string, Partial<MapFilter> | null][] = [
    [t('home.tab.rec'), null],
    [t('home.tab.old'), { view: 'list', sort: 'old' }],
    [t('home.tab.near'), { view: 'list', sort: 'near' }],
    [t('home.tab.model'), { view: 'list', model: true }],
    [`${t('saved')}${saved.length ? ` ${saved.length}` : ''}`, { view: 'list', saved: true }],
  ]

  return (
    <div className="h-full overflow-y-auto bg-white">
      <header className="sticky top-0 z-10 bg-white">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-1.5 text-accent">
            <Logo size={30} color="var(--color-accent)" />
            <span className="text-[25px] font-black tracking-[-0.06em]">{lang === 'ko' ? '나이테' : 'NAITE'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label={t('map.search')} onClick={() => openMap({ view: 'list' })} className="p-1 text-ink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            </button>
            <LangToggle />
          </div>
        </div>
        <nav data-noswipe className="no-scrollbar flex gap-5 overflow-x-auto border-b border-gray-100 px-5">
          {tabs.map(([label, f], k) => (
            <button
              key={k}
              onClick={() => f && openMap(f)}
              className={`shrink-0 border-b-[2.5px] py-2.5 text-[16px] ${k === 0 ? 'border-accent font-bold text-ink' : 'border-transparent font-medium text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {err && <p className="p-8 text-center text-sm text-gray-500">{t('error')}</p>}
      {!stores && !err && <p className="p-8 text-center text-sm text-gray-500">{t('loading')}</p>}
      {stores && (
        <>
          <BannerCarousel banners={banners} active={active} />

          <div data-noswipe className="no-scrollbar mt-5 flex justify-center gap-1.5 overflow-x-auto px-5">
            {[null, ...DECADES].map((d) => (
              <button
                key={d ?? 'all'}
                onClick={() => setDecade(d)}
                aria-pressed={decade === d}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] ${decade === d ? 'bg-accent font-bold text-white' : 'border border-gray-200 font-medium text-gray-700'}`}
              >
                {d ? t('decade', { d }) : t('filter.all')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-y-5 px-3 pb-7 pt-6">
            {CATS.map((c) => (
              <button key={c} onClick={() => openMap({ cat: c, view: 'map' })} className="press flex flex-col items-center gap-1.5">
                <span className="flex size-14 items-center justify-center rounded-full bg-accent-50 text-accent">
                  <CategoryIcon cat={c} size={28} />
                </span>
                <span className="text-[13px] font-medium text-gray-800">{catLabel(c, lang)}</span>
                <span className="-mt-1 text-[11px] text-gray-500">{t('list.count', { n: counts.get(c) ?? 0 })}</span>
              </button>
            ))}
          </div>

          <Gap />
          <Section kicker={t('home.near.kicker')} title={t('home.near.title')} more={() => openMap({ view: 'list', sort: 'near' })}>
            <div data-noswipe className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5">
              {near.map((s) => (
                <StoreTile key={s.slug} s={s} />
              ))}
            </div>
          </Section>

          <Gap />
          <Section kicker={t('home.old.kicker')} title={t('home.old.title')} more={() => openMap({ view: 'list', sort: 'old' })}>
            <ul>
              {oldest.map((s, k) => (
                <li key={s.slug}>
                  <StoreRow s={s} rank={k + 1} />
                </li>
              ))}
            </ul>
          </Section>

          <p className="bg-gray-50 px-5 pb-8 pt-5 text-[11px] leading-4 text-gray-500">
            {lang === 'ko'
              ? '출처: 서울특별시 마포구 일반음식점 인허가 정보, 소상공인시장진흥공단 상가(상권)정보 외. 업력은 인허가 기준이며 실제와 다를 수 있어요.'
              : 'Sources: Mapo-gu restaurant license data (Seoul), SEMAS commercial district data, and others. Years are based on business licenses.'}
          </p>
        </>
      )}
    </div>
  )
}
