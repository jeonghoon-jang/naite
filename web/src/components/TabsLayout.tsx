import { useRef, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../lib/i18n'
import AskPage from '../pages/AskPage'
import MapPage from '../pages/MapPage'
import ReelsPage from '../pages/ReelsPage'

export const TABS = [
  { path: '/', key: 'tab.map', icon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" /> },
  { path: '/reels', key: 'tab.reels', icon: <path d="M5 3h14v18H5zM10 9l5 3-5 3V9Z" /> },
  { path: '/ask', key: 'tab.ask', icon: <path d="M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5" /> },
] as const

/**
 * 하단 탭 3개(지도/릴스/AI 챗봇). 세 화면을 가로로 나란히 두고 이동만 해서
 * 지도 상태·챗봇 대화가 탭을 오가도 유지된다. 좌우 스와이프로 전환,
 * 단 data-noswipe 영역(지도)에서 시작한 제스처는 지도 조작으로 남긴다.
 */
export default function TabsLayout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { t } = useI18n()
  const idx = Math.max(0, TABS.findIndex((x) => x.path === pathname))
  const touch = useRef<{ x: number; y: number; at: number; skip: boolean } | null>(null)

  const panels: ReactNode[] = [<MapPage key="map" />, <ReelsPage key="reels" active={idx === 1} />, <AskPage key="ask" />]

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
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
          if (next >= 0 && next < TABS.length) nav(TABS[next].path, { replace: true })
        }}
      >
        <div className="flex h-full w-[300%] transition-transform duration-300 ease-out" style={{ transform: `translateX(-${(idx * 100) / 3}%)` }}>
          {panels.map((p, i) => (
            <section key={i} className="h-full w-1/3 overflow-hidden" aria-hidden={i !== idx} inert={i !== idx}>
              {p}
            </section>
          ))}
        </div>
      </div>
      <nav className="grid grid-cols-3 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            replace
            end
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-neutral-500'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
              {tab.icon}
            </svg>
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
