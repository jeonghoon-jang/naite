import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from '../lib/i18n'
import LangToggle from './LangToggle'

export default function BackHeader({ title, right }: { title?: ReactNode; right?: ReactNode }) {
  const nav = useNavigate()
  const { t } = useI18n()
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-neutral-200 bg-white px-2">
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label={t('back')} className="p-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div className="min-w-0 flex-1 truncate font-semibold">{title}</div>
      {right}
      <LangToggle />
    </header>
  )
}
