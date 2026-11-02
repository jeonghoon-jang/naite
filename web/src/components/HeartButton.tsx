import { useI18n } from '../lib/i18n'
import { toggleSaved, useSaved } from '../lib/saved'

export default function HeartButton({ slug, size = 22 }: { slug: string; size?: number }) {
  const { t } = useI18n()
  const on = useSaved().includes(slug)
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
      className="-m-2 p-2 text-accent"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
