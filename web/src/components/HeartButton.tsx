import { useI18n } from '../lib/i18n'
import { toggleSaved, useSaved } from '../lib/saved'

/** 저장(localStorage). tone=onImage 는 썸네일 위에 올릴 때(흰 테두리). */
export default function HeartButton({ slug, size = 22, tone = 'default' }: { slug: string; size?: number; tone?: 'default' | 'onImage' }) {
  const { t } = useI18n()
  const on = useSaved().includes(slug)
  const color = on ? 'text-accent' : tone === 'onImage' ? 'text-white' : 'text-gray-300'
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t('saved') : t('save')}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleSaved(slug)
      }}
      className={`-m-2 p-2 ${color}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'currentColor' : tone === 'onImage' ? 'rgba(0,0,0,.18)' : 'none'} stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
