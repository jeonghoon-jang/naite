import type { ReactNode } from 'react'

export default function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'accent' }) {
  const cls = tone === 'accent' ? 'border-accent/40 text-accent' : 'border-neutral-300 text-neutral-500'
  return <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[11px] leading-4 ${cls}`}>{children}</span>
}
