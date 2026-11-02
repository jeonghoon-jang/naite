import { useI18n } from '../lib/i18n'

export default function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="flex overflow-hidden rounded border border-neutral-300 text-xs">
      {(['ko', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 ${lang === l ? 'bg-ink text-white' : 'bg-white text-neutral-600'}`}>
          {l === 'ko' ? '한' : 'EN'}
        </button>
      ))}
    </div>
  )
}
