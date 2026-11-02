import { Link } from 'react-router'
import { bizLabel, displayName, sinceYear, tagLabel, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import type { StoreCard as S } from '../lib/types'
import HeartButton from './HeartButton'
import NaiteRing from './NaiteRing'
import StatusBadges from './StatusBadges'

export default function StoreCard({ s, reason, active }: { s: S; reason?: string; active?: boolean }) {
  const { t, lang } = useI18n()
  const tags = s.cuisine_tags.length ? s.cuisine_tags.map((x) => tagLabel(x, lang)).join(' · ') : bizLabel(s.biz_type, lang)
  return (
    <Link to={`/s/${s.slug}`} className={`flex gap-3 px-4 py-3 ${active ? 'bg-accent-soft' : 'bg-white'}`}>
      <NaiteRing years={s.years_by_license} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{displayName(s, lang)}</span>
          <StatusBadges s={s} />
        </div>
        <div className="mt-0.5 text-sm text-neutral-700">
          {t('since', { year: sinceYear(s.license_date) ?? '-' })} · {t('yearsN', { n: yearsInt(s.years_by_license) ?? '-' })}
          <span className="text-neutral-400"> ({t('byLicense')})</span>
        </div>
        <div className="mt-0.5 truncate text-[13px] text-neutral-500">
          {tags}
          {s.dong ? ` · ${s.dong}` : ''}
          {s.dist_m != null ? ` · ${s.dist_m}m` : ''}
        </div>
        {reason && <div className="mt-1 text-[13px] text-accent">{reason}</div>}
      </div>
      <div className="self-start">
        <HeartButton slug={s.slug} />
      </div>
    </Link>
  )
}
