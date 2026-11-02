import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import en from '../locales/en.json'
import ko from '../locales/ko.json'

export type Lang = 'ko' | 'en'
type Key = keyof typeof ko
const dict: Record<Lang, Record<Key, string>> = { ko, en }

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string }>(null!)

function initial(): Lang {
  const saved = localStorage.getItem('naite:lang')
  if (saved === 'ko' || saved === 'en') return saved
  return navigator.language.startsWith('ko') ? 'ko' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('naite:lang', l)
    setLangState(l)
  }, [])
  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) =>
      Object.entries(vars ?? {}).reduce((s, [v, x]) => s.replaceAll(`{${v}}`, String(x)), dict[lang][k] ?? k),
    [lang],
  )
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
