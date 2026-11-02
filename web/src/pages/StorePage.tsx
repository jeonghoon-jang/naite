import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import BackHeader from '../components/BackHeader'
import Badge from '../components/Badge'
import HeartButton from '../components/HeartButton'
import NaiteRing from '../components/NaiteRing'
import Roadview from '../components/Roadview'
import StatusBadges from '../components/StatusBadges'
import { bizLabel, displayName, kakaoDirections, kakaoMapLink, sinceYear, tagLabel, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { fetchStore } from '../lib/supabase'
import { MENU_SOURCE } from '../lib/tags'
import type { StoreDetail } from '../lib/types'

export default function StorePage() {
  const { slug = '' } = useParams()
  const { t, lang } = useI18n()
  const [s, setS] = useState<StoreDetail | null | undefined>(undefined)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetchStore(slug).then(setS, () => setErr(true))
  }, [slug])

  if (err || s === null)
    return (
      <div className="h-full">
        <BackHeader />
        <p className="p-8 text-center text-sm text-neutral-500">{err ? t('error') : t('store.notFound')}</p>
      </div>
    )
  if (!s)
    return (
      <div className="h-full">
        <BackHeader />
        <p className="p-8 text-center text-sm text-neutral-500">{t('loading')}</p>
      </div>
    )

  const year = sinceYear(s.license_date)
  const summary = lang === 'en' ? s.summary_en : s.summary_ko
  return (
    <div className="h-full overflow-y-auto">
      <BackHeader title={displayName(s, lang)} right={<HeartButton slug={s.slug} />} />

      {s.photo_url && (
        <figure className="relative">
          <img src={s.photo_url} alt="" className="aspect-[4/3] w-full object-cover" />
          <figcaption className="absolute left-2 top-2">
            <span className="rounded bg-white/90 px-1.5 py-px text-[11px] text-neutral-600">{t('badge.mock')}</span>
          </figcaption>
        </figure>
      )}

      <section className="flex items-center gap-4 px-4 py-5">
        <NaiteRing years={s.years_by_license} size={96} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">{displayName(s, lang)}</h1>
          {lang === 'en' && <div className="text-sm text-neutral-500">{s.name}</div>}
          <div className="mt-1 text-lg font-semibold text-accent">
            {t('since', { year: year ?? '-' })} · {t('yearsN', { n: yearsInt(s.years_by_license) ?? '-' })}
          </div>
          <div className="text-xs text-neutral-500">{t('byLicense')}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <StatusBadges s={s} />
            {s.is_model_restaurant && <Badge>{t('badge.model')}</Badge>}
          </div>
        </div>
      </section>

      {s.data_status === 'candidate' && <p className="mx-4 mb-3 rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-500">{t('store.unverifiedNote')}</p>}

      <dl className="divide-y divide-neutral-100 border-t border-neutral-200 text-sm">
        <Row k={lang === 'ko' ? '업종' : 'Type'}>
          {[bizLabel(s.biz_type, lang), ...s.cuisine_tags.map((x) => tagLabel(x, lang))].filter(Boolean).join(' · ')}
        </Row>
        <Row k={t('store.menu')}>
          {s.menu_main ? (
            <>
              {s.menu_main}
              {s.menu_source && MENU_SOURCE[s.menu_source] && (
                <span className="ml-1 text-xs text-neutral-400">({t('store.menuSource', { src: MENU_SOURCE[s.menu_source][lang] })})</span>
              )}
            </>
          ) : (
            <span className="text-neutral-400">{t('store.menuUnknown')}</span>
          )}
        </Row>
        <Row k={lang === 'ko' ? '주소' : 'Address'}>
          {s.address}
          {s.dist_m != null && <div className="text-xs text-neutral-500">{t('dist', { m: s.dist_m })}</div>}
        </Row>
        {summary && <Row k={lang === 'ko' ? '요약' : 'Summary'}>{summary}</Row>}
      </dl>

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <a href={kakaoMapLink(s)} target="_blank" rel="noreferrer" className="rounded border border-neutral-300 py-2.5 text-center text-sm font-medium">
          {t('store.kakao')}
        </a>
        <a href={kakaoDirections(s)} target="_blank" rel="noreferrer" className="rounded border border-neutral-300 py-2.5 text-center text-sm font-medium">
          {t('store.directions')}
        </a>
        {s.menus.length > 0 && (
          <Link to={`/s/${s.slug}/menu`} className="col-span-2 rounded bg-accent py-3 text-center text-sm font-semibold text-white">
            {t('store.englishMenu')}
          </Link>
        )}
      </div>

      <Roadview lat={s.lat} lng={s.lng} />

      <section className="border-t border-neutral-200 px-4 py-4 pb-10">
        <h2 className="mb-2 text-xs font-semibold text-neutral-500">{t('store.sources')}</h2>
        <ul className="space-y-1 text-[11px] leading-4 text-neutral-500">
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
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <dt className="w-20 shrink-0 text-neutral-500">{k}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}
