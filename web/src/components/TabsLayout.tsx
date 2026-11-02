import { useRef, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../lib/i18n'
import AskPage from '../pages/AskPage'
import HomePage from '../pages/HomePage'
import MapPage from '../pages/MapPage'
import ReelsPage from '../pages/ReelsPage'

export const TABS = [
  { path: '/', key: 'tab.home', icon: (on: boolean) => <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5H9v5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" fill={on ? 'currentColor' : 'none'} /> },
  { path: '/map', key: 'tab.map', icon: (on: boolean) => <path d="M12 21s7-6.6 7-11.5a7 7 0 0 0-14 0C5 14.4 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill={on ? 'currentColor' : 'none'} fillRule="evenodd" /> },
  { path: '/reels', key: 'tab.reels', icon: (on: boolean) => <><rect x="4" y="3" width="16" height="18" rx="4" fill={on ? 'currentColor' : 'none'} /><path d="M10 9v6l5-3-5-3Z" fill={on ? '#fff' : 'currentColor'} stroke={on ? '#fff' : 'currentColor'} /></> },
  { path: '/ask', key: 'tab.ask', icon: (on: boolean) => <path d="M12 4c4.7 0 8.5 3.1 8.5 7s-3.8 7-8.5 7c-.9 0-1.7-.1-2.5-.3L5 20l.9-3.6C4.4 15.1 3.5 13.2 3.5 11c0-3.9 3.8-7 8.5-7Z" fill={on ? 'currentColor' : 'none'} /> },
] as const

/**
 * 하단 탭 4개(홈/지도/릴스/AI 챗봇). 네 화면을 가로로 나란히 두고 이동만 해서
 * 지도 상태·챗봇 대화가 탭을 오가도 유지된다. 좌우 스와이프로 전환,
 * 단 data-noswipe 영역(지도, 가로 스크롤 줄)에서 시작한 제스처는 그 조작으로 남긴다.
 */
export default function TabsLayout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { t } = useI18n()
  const idx = Math.max(0, TABS.findIndex((x) => x.path === pathname))
  const touch = useRef<{ x: number; y: number; at: number; skip: boolean } | null>(null)
  const n = TABS.length

  const panels: ReactNode[] = [<HomePage key="home" active={idx === 0} />, <MapPage key="map" active={idx === 1} />, <ReelsPage key="reels" active={idx === 2} />, <AskPage key="ask" />]

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onScroll={(e) => {
          if (e.currentTarget.scrollLeft) e.currentTarget.scrollLeft = 0 // 탭 틀은 transform으로만 움직인다
        }}
        onTouchStart={(e) => {
          const p = e.touches[0]
          touch.current = { x: p.clientX, y: p.clientY, at: Date.now(), skip: !!(e.target as HTMLElement).closest('[data-noswipe]') }
        }}
        onTouchEnd={(e) => {
          const s = touch.current
          touch.current = null
          if (!s || s.skip) return
          const p = e.changedTouches[0]
          const dx = p.clientX - s.x
          const dy = p.clientY - s.y
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.at > 700) return
          const next = idx + (dx < 0 ? 1 : -1)
          if (next >= 0 && next < n) nav(TABS[next].path, { replace: true })
        }}
      >
        <div className="flex h-full transition-transform duration-300 ease-out" style={{ width: `${n * 100}%`, transform: `translateX(-${(idx * 100) / n}%)` }}>
          {panels.map((p, i) => (
            <section key={i} className="h-full overflow-hidden" style={{ width: `${100 / n}%` }} aria-hidden={i !== idx} inert={i !== idx}>
              {p}
            </section>
          ))}
        </div>
      </div>
      <nav className="grid grid-cols-4 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            replace
            end
            className={({ isActive }) => `flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] ${isActive ? 'font-bold text-accent' : 'font-medium text-gray-500'}`}
          >
            {({ isActive }) => (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" className={isActive ? '' : 'text-gray-400'}>
                  {tab.icon(isActive)}
                </svg>
                {t(tab.key)}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
