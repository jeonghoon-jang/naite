import { Link } from 'react-router'
import { categoryOf } from '../lib/category'
import { displayName, sinceYear, storeMeta, yearsInt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import type { StoreCard as S } from '../lib/types'
import { CategoryArt } from './CategoryIcon'
import HeartButton from './HeartButton'
import StatusBadges from './StatusBadges'

/** 가로 목록 한 줄: 썸네일 · 이름 · 업력 · 업종/동/거리 · 하트 */
export default function StoreRow({ s, reason, active, rank }: { s: S; reason?: string; active?: boolean; rank?: number }) {
  const { t, lang } = useI18n()
  const years = yearsInt(s.years_by_license)
  return (
    <Link to={`/s/${s.slug}`} className={`press flex items-center gap-3.5 px-5 py-3 ${active ? 'bg-accent-50' : ''}`}>
      {rank != null && <span className={`w-4 shrink-0 text-center text-[17px] font-black ${rank <= 3 ? 'text-accent' : 'text-gray-500'}`}>{rank}</span>}
      <CategoryArt cat={categoryOf(s)} className="size-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[16px] font-bold">{displayName(s, lang)}</span>
          <StatusBadges s={s} />
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-gray-700">
          {t('since', { year: sinceYear(s.license_date) ?? '-' })} · <span className="text-accent">{t('yearsN', { n: years ?? '-' })}</span>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-gray-500">{storeMeta(s, lang)}</div>
        {reason && <div className="mt-1 text-[13px] text-accent">{reason}</div>}
      </div>
      <HeartButton slug={s.slug} />
    </Link>
  )
}

/** 가로 스크롤용 세로 카드: 큰 썸네일 + 업력 뱃지 */
export function StoreTile({ s, width = 148 }: { s: S; width?: number }) {
  const { t, lang } = useI18n()
  return (
    <Link to={`/s/${s.slug}`} className="press block shrink-0 snap-start" style={{ width }}>
      <div className="relative">
        <CategoryArt cat={categoryOf(s)} className="aspect-[148/120] w-full rounded-2xl" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
          {t('yearsN', { n: yearsInt(s.years_by_license) ?? '-' })}
        </span>
        <span className="absolute right-2.5 top-2.5">
          <HeartButton slug={s.slug} size={20} tone="onImage" />
        </span>
      </div>
      <div className="mt-2 truncate text-[15px] font-bold">{displayName(s, lang)}</div>
      <div className="text-[13px] font-medium text-accent">{t('since', { year: sinceYear(s.license_date) ?? '-' })}</div>
      <div className="truncate text-[12px] text-gray-500">{storeMeta(s, lang)}</div>
    </Link>
  )
}
