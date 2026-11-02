import { useEffect, useState, type ReactNode } from 'react'
import { CustomOverlayMap, Map } from 'react-kakao-maps-sdk'
import { Link, useParams } from 'react-router'
import BackHeader, { BackIcon, useBack } from '../components/BackHeader'
import Badge from '../components/Badge'
import { CategoryArt } from '../components/CategoryIcon'
import HeartButton from '../components/HeartButton'
import Roadview from '../components/Roadview'
import StatusBadges from '../components/StatusBadges'
import { catLabel, categoryOf } from '../lib/category'
import { bizLabel, displayName, distLabel, kakaoDirections, kakaoMapLink, sinceYear, tagLabel, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { useKakao } from '../lib/kakao'
import { useSaved } from '../lib/saved'
import { fetchStore } from '../lib/supabase'
import { MENU_SOURCE } from '../lib/tags'
import type { StoreDetail } from '../lib/types'

const Gap = () => <div className="h-2.5 bg-gray-100" />

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5 px-5 py-6">
      <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

const RoundBtn = ({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) => (
  <button onClick={onClick} aria-label={label} className="flex size-10 items-center justify-center rounded-full bg-white text-ink">
    {children}
  </button>
)

export default function StorePage() {
  const { slug = '' } = useParams()
  const { t, lang } = useI18n()
  const back = useBack()
  const kakao = useKakao()
  const savedOn = useSaved().includes(slug)
  const [s, setS] = useState<StoreDetail | null | undefined>(undefined)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetchStore(slug).then(setS, () => setErr(true))
  }, [slug])

  if (err || !s)
    return (
      <div className="h-full">
        <BackHeader />
        <p className="p-8 text-center text-sm text-gray-500">{err ? t('error') : s === null ? t('store.notFound') : t('loading')}</p>
      </div>
    )

  const year = sinceYear(s.license_date)
  const years = yearsInt(s.years_by_license)
  const rings = Math.max(1, Math.floor((years ?? 0) / 10))
  const cat = categoryOf(s)
  const summary = lang === 'en' ? s.summary_en : s.summary_ko
  const typeText = [bizLabel(s.biz_type, lang), ...s.cuisine_tags.map((x) => tagLabel(x, lang))].filter(Boolean).join(' · ')

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-[300px]">
          {s.photo_url ? (
            <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <CategoryArt cat={cat} rings={Math.min(5, rings)} className="h-full w-full" />
          )}
          <div className="absolute inset-x-4 top-3 flex justify-between">
            <RoundBtn label={t('back')} onClick={back}>
              <BackIcon />
            </RoundBtn>
            <span className="flex size-10 items-center justify-center rounded-full bg-white">
              <HeartButton slug={s.slug} />
            </span>
          </div>
          <span className="absolute bottom-9 right-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white">
            {s.photo_url ? t('badge.mock') : t('store.rings', { n: rings })}
          </span>
        </div>

        <div className="relative -mt-6 rounded-t-[28px] bg-white">
          <section className="space-y-2 px-5 pb-5 pt-6">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadges s={s} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h1 className="text-[28px] font-black tracking-tight">{displayName(s, lang)}</h1>
              <span className="text-[15px] font-medium text-gray-500">
                {catLabel(cat, lang)}
                {s.dong ? ` · ${s.dong}` : ''}
              </span>
            </div>
            {lang === 'en' && <div className="-mt-1 text-sm text-gray-500">{s.name}</div>}
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[22px] font-black tracking-tight text-accent">
                {t('since', { year: year ?? '-' })} {t('yearsN', { n: years ?? '-' })}
              </span>
              <span className="text-[12px] font-medium text-gray-500">{t('byLicense')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                [t('store.licensed'), s.license_date?.replaceAll('-', '.') ?? '-'],
                [t('store.years'), t('yearsN', { n: years ?? '-' })],
                [t('store.type'), bizLabel(s.biz_type, lang) || catLabel(cat, lang)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-gray-50 px-3.5 py-3.5">
                  <div className="text-[12px] font-medium text-gray-500">{k}</div>
                  <div className="mt-1 truncate text-[16px] font-bold">{v}</div>
                </div>
              ))}
            </div>
            {summary && <p className="pt-2 text-[15px] leading-6 text-gray-700">{summary}</p>}
            {s.data_status === 'candidate' && <p className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-[12px] text-gray-500">{t('store.unverifiedNote')}</p>}
          </section>

          <Gap />
          <Section title={t('store.section.menu')}>
            <div className="flex gap-3 text-[15px]">
              <span className="w-16 shrink-0 text-gray-500">{t('store.menu')}</span>
              <span className="min-w-0 flex-1">
                {s.menu_main ?? <span className="text-gray-400">{t('store.menuUnknown')}</span>}
                {s.menu_main && s.menu_source && MENU_SOURCE[s.menu_source] && (
                  <span className="ml-1 text-[12px] text-gray-400">({t('store.menuSource', { src: MENU_SOURCE[s.menu_source][lang] })})</span>
                )}
              </span>
            </div>
            <div className="flex gap-3 text-[15px]">
              <span className="w-16 shrink-0 text-gray-500">{t('store.type')}</span>
              <span className="min-w-0 flex-1">{typeText}</span>
            </div>
            {s.menus.length > 0 && (
              <Link to={`/s/${s.slug}/menu`} className="press flex items-center gap-3 rounded-[18px] bg-accent-50 px-4.5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[16px] font-bold">
                    {t('store.englishMenu')}
                    <Badge tone="solid">{t('badge.mock')}</Badge>
                  </div>
                  <div className="text-[13px] text-gray-600">{t('store.menuBannerSub')}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </Link>
            )}
          </Section>

          <Gap />
          <Section title={t('store.section.location')}>
            <p className="text-[15px] leading-6 text-gray-700">
              {s.address}
              {s.dist_m != null && <span className="block text-gray-500">{t('dist', { m: distLabel(s.dist_m) })}</span>}
            </p>
            {!kakao.loading && !kakao.error && (
              <div className="h-[150px] overflow-hidden rounded-[18px] bg-gray-100">
                <Map center={{ lat: s.lat, lng: s.lng }} level={3} draggable={false} zoomable={false} disableDoubleClickZoom className="h-full w-full">
                  <CustomOverlayMap position={{ lat: s.lat, lng: s.lng }} yAnchor={1}>
                    <svg width="36" height="44" viewBox="0 0 36 44" aria-hidden>
                      <path d="M18 43s15-13.5 15-25A15 15 0 0 0 3 18c0 11.5 15 25 15 25Z" fill="var(--color-accent)" stroke="#fff" strokeWidth="2" />
                      <circle cx="18" cy="18" r="5" fill="#fff" />
                    </svg>
                  </CustomOverlayMap>
                </Map>
              </div>
            )}
            <a href={kakaoMapLink(s)} target="_blank" rel="noreferrer" className="press block rounded-2xl border border-gray-200 py-3.5 text-center text-[14px] font-bold text-gray-800">
              {t('store.kakao')}
            </a>
            <Roadview lat={s.lat} lng={s.lng} />
          </Section>

          <Gap />
          <section className="bg-white px-5 py-5 pb-8">
            <h2 className="mb-1.5 text-[14px] font-bold text-gray-700">{t('store.sources')}</h2>
            <ul className="space-y-1 text-[12px] leading-[18px] text-gray-500">
              {s.sources.filter((x) => !x.note).map((x) => (
                <li key={x.name}>
                  {x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="underline">{x.name}</a> : x.name}
                  {x.license ? ` · ${x.license}` : ''}
                  {x.fetched_at ? ` · ${x.fetched_at}` : ''}
                </li>
              ))}
              {s.photo_url && <li>{s.photo_credit ?? t('badge.mock')}</li>}
              <li>{lang === 'ko' ? '지도·로드뷰: 카카오' : 'Map & Roadview: Kakao'}</li>
            </ul>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-gray-100 bg-white px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <div className="flex flex-col items-center px-2 text-[11px] font-medium text-gray-600">
          <HeartButton slug={s.slug} size={26} />
          <span className="-mt-1">{savedOn ? t('saved') : t('store.save')}</span>
        </div>
        <a href={kakaoDirections(s)} target="_blank" rel="noreferrer" className="press flex-1 rounded-2xl bg-accent py-4 text-center text-[17px] font-bold text-white">
          {t('store.directions')}
        </a>
      </div>
    </div>
  )
}
