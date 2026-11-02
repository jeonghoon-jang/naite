import type { Cat } from '../lib/category'
import { ringPath } from '../lib/rings'

/** 24 그리드 라인 아이콘. 사진 대신 업종을 보여준다. */
export const ICON_PATHS: Record<Cat, string> = {
  한식: '<path d="M5 11C5 7.6 8.1 5.5 12 5.5S19 7.6 19 11"/><path d="M3.5 11h17c0 4.6-3.8 8-8.5 8s-8.5-3.4-8.5-8Z"/><path d="M9.2 19l.5 1.6h4.6l.5-1.6"/>',
  고기: '<path d="M5 9.5C5 6.5 8.6 4.6 12.8 5c4.6.5 7.4 3.4 7 6.8-.4 3.4-4.4 4.2-7.6 3.4C9 14.3 5 13 5 9.5Z"/><circle cx="10" cy="9.6" r="1.7"/><path d="M4 19.5h16M7.5 17.5v4M12 17.5v4M16.5 17.5v4"/>',
  닭: '<path d="M12.2 13.8c-2.4-2.4-2.2-6.6.4-8.6 2.6-2 6.6-1.6 8 1.2 1.3 2.6 0 6.2-3 7.2-2 .7-4 1.6-5.4.2Z"/><path d="M12.2 13.8L8 18"/><circle cx="6.3" cy="17.6" r="1.6"/><circle cx="8.4" cy="19.7" r="1.6"/>',
  양식: '<path d="M4 16.5C4 12 7.6 8.5 12 8.5s8 3.5 8 8Z"/><circle cx="12" cy="6.8" r="1.3"/><path d="M2.5 19.5h19"/>',
  중식: '<path d="M3.5 14.5C3.5 9.8 7.3 6.5 12 6.5s8.5 3.3 8.5 8c0 2.4-3.8 3.8-8.5 3.8s-8.5-1.4-8.5-3.8Z"/><path d="M8.6 7.6l1 3M12 6.5v3.4M15.4 7.6l-1 3"/>',
  국수: '<path d="M3.5 12h17c0 4.4-3.8 7.5-8.5 7.5S3.5 16.4 3.5 12Z"/><path d="M13.5 12L19.5 3M16.2 12l5-7.5"/><path d="M7.5 12c0-1.5 1.3-1.7 1.3-3.2M10.5 12c0-1.5 1.3-1.7 1.3-3.2"/>',
  분식: '<path d="M12 2.5v19"/><rect x="8.5" y="4" width="7" height="4.4" rx="2.2"/><rect x="8.5" y="9.6" width="7" height="4.4" rx="2.2"/><rect x="8.5" y="15.2" width="7" height="4.4" rx="2.2"/>',
  술집: '<path d="M5 8h10v11c0 .9-.7 1.5-1.5 1.5h-7C5.7 20.5 5 19.9 5 19V8Z"/><path d="M15 10.5h2.5c1.1 0 2 .9 2 2V15c0 1.1-.9 2-2 2H15"/><path d="M4.6 8c-.7-2 1-3.7 2.9-3.1.9-1.7 3.5-1.9 4.7-.5 1.8-.8 3.8.6 3.3 3.6"/><path d="M8.5 11v6.5M11.5 11v6.5"/>',
  일식: '<path d="M4.5 15c0-2 2-2.8 7.5-2.8s7.5.8 7.5 2.8-1.8 3.3-7.5 3.3S4.5 17 4.5 15Z"/><path d="M4 11.2c2-3.8 12.2-5.4 16-1.2.5.6.1 1.6-.9 1.7-3.9.4-11 .5-14.4.2-.7 0-.9-.4-.7-.7Z"/><path d="M10.5 7.4v10.8M13.5 7.2v11"/>',
  장어: '<path d="M3 13c2.5-4.5 5.5-4.5 7.5-1 1.8 3.2 4.5 3.2 7-1.5"/><path d="M3 13c2.6-2 4.6-1.8 6.2.6 2 3.4 6 3.8 9.5-1.2"/><path d="M17.5 10.5c1-2 3.5-2.3 4-.7.4 1.2-1 2.5-2.8 2.6"/>',
}

export default function CategoryIcon({ cat, size = 24, strokeWidth = 1.8, className }: { cat: Cat; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[cat] }}
    />
  )
}

const ART_RINGS = [1, 2, 3, 4, 5].map((i) => ringPath(50, 50, 15 + i * 6.5, i * 1.3, 0.04))

/**
 * 사진 대신 쓰는 썸네일: 나이테 동심원 + 업종 아이콘. 카카오·블로그 사진은 쓰지 않는다.
 * rings 를 주면 그 겹(10년 = 1겹)만 진하게 그린다.
 */
export function CategoryArt({ cat, className = '', dark = false, rings }: { cat: Cat; className?: string; dark?: boolean; rings?: number }) {
  const line = dark ? '#5a3a28' : 'var(--color-accent-100)'
  const strong = dark ? '#f3c7a6' : 'var(--color-accent)'
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${dark ? 'bg-accent-dark' : 'bg-accent-50'} ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
        {ART_RINGS.map((d, i) => (
          <path key={i} d={d} stroke={rings && i + 1 === rings ? strong : line} strokeWidth={rings && i + 1 === rings ? 1.6 : i === 4 ? 1.4 : 1} />
        ))}
      </svg>
      <span className="relative" style={{ color: strong }}>
        <CategoryIcon cat={cat} size={36} strokeWidth={1.6} className="h-auto w-[34%] max-w-24 min-w-6" />
      </span>
    </div>
  )
}
