import { ringPath } from '../lib/rings'

const SPOON =
  'M0 -15 C7.2 -15 11.5 -8.5 11.5 -0.8 C11.5 6.4 7.2 11.6 2.8 13.2 L3.6 58 Q3.6 62 0 62 Q-3.6 62 -3.6 58 L-2.8 13.2 C-7.2 11.6 -11.5 6.4 -11.5 -0.8 C-11.5 -8.5 -7.2 -15 0 -15 Z'
const RINGS_FULL = [[29.5, 2.6], [23, 2.4], [16.8, 2.2], [10.8, 2]].map(([r, w], i) => ({ d: ringPath(47, 55, r, 1.1 + i * 1.7, 0.06), w }))
const RINGS_SIMPLE = [{ d: ringPath(47, 55, 24, 1.1, 0.06), w: 4.2 }]

/** 로고 C: 위에서 본 그릇(나이테 단면) + 걸쳐진 숟가락. 32px 이하는 나이테 1겹 단순형. */
export default function Logo({ size = 28, color = 'currentColor', bg = '#fff' }: { size?: number; color?: string; bg?: string }) {
  const simple = size <= 32
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="46" cy="56" r="37" stroke={color} strokeWidth={simple ? 9 : 7.5} />
      {(simple ? RINGS_SIMPLE : RINGS_FULL).map((r) => (
        <path key={r.d} d={r.d} stroke={color} strokeWidth={r.w} />
      ))}
      <circle cx="48" cy="54" r={simple ? 4.5 : 3} fill={color} />
      <g transform="translate(38 64) rotate(-140)">
        <path d={SPOON} fill={bg} stroke={bg} strokeWidth={simple ? 9 : 7.5} strokeLinejoin="round" />
        <path d={SPOON} fill={color} />
      </g>
    </svg>
  )
}
