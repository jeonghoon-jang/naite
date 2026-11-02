import { useI18n } from '../lib/i18n'
import type { StoreCard } from '../lib/types'
import Badge from './Badge'

export default function StatusBadges({ s }: { s: Pick<StoreCard, 'data_status' | 'is_baeknyeon'> & { is_model_restaurant?: boolean } }) {
  const { t } = useI18n()
  return (
    <>
      {s.is_baeknyeon && <Badge tone="accent">{t('badge.baeknyeon')}</Badge>}
      {s.is_model_restaurant && <Badge tone="accent">{t('badge.model')}</Badge>}
      {s.data_status === 'candidate' && <Badge>{t('badge.unverified')}</Badge>}
      {s.data_status === 'mock' && <Badge>{t('badge.mock')}</Badge>}
    </>
  )
}
