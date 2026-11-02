import type { ReactNode } from 'react'

export default function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'accent' | 'solid' }) {
  const cls = tone === 'solid' ? 'bg-accent text-white' : tone === 'accent' ? 'bg-accent-50 text-accent' : 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-4 ${cls}`}>{children}</span>
}
