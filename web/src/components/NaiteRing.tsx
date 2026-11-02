type Props = { years: number | null; size?: number; showNumber?: boolean; className?: string }

/** 사진 대신 쓰는 나이테 카드. 10년 = 1겹, 가운데 업력 숫자. */
export default function NaiteRing({ years, size = 56, showNumber = true, className }: Props) {
  const y = Math.max(0, Math.floor(years ?? 0))
  const rings = Math.max(1, Math.floor(y / 10))
  const c = 50
  const inner = 18
  const outer = 47
  const step = rings > 1 ? (outer - inner) / (rings - 1) : 0
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label={`${y}`} role="img">
      <circle cx={c} cy={c} r={outer + 2} fill="#fff" />
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={rings > 1 ? inner + step * i : outer}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={i === rings - 1 ? 3 : 1.6}
          opacity={0.35 + (0.65 * (i + 1)) / rings}
        />
      ))}
      {showNumber && (
        <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={y >= 100 ? 22 : 28} fontWeight={700} fill="var(--color-ink)">
          {y}
        </text>
      )}
    </svg>
  )
}
