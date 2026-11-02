import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from '../lib/i18n'
import LangToggle from './LangToggle'

export function useBack() {
  const nav = useNavigate()
  return () => (history.length > 1 ? nav(-1) : nav('/'))
}

export const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export default function BackHeader({ title, right }: { title?: ReactNode; right?: ReactNode }) {
  const back = useBack()
  const { t } = useI18n()
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 bg-white px-2">
      <button onClick={back} aria-label={t('back')} className="p-2 text-ink">
        <BackIcon />
      </button>
      <div className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</div>
      {right}
      <LangToggle />
      <span className="w-2" />
    </header>
  )
}
