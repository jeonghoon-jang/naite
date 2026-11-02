import { useI18n } from '../lib/i18n'

/** 지금과 다른 언어 이름을 보여주는 버튼 하나 (한 ↔ EN) */
export default function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <button
      onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
      aria-label={lang === 'ko' ? 'English' : '한국어'}
      className="rounded-full bg-gray-100 px-2.5 py-1 text-[13px] font-bold text-gray-800"
    >
      {lang === 'ko' ? 'EN' : '한'}
    </button>
  )
}
