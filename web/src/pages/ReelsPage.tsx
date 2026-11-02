import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import NaiteRing from '../components/NaiteRing'
import { displayName, sinceYear } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { fetchReels } from '../lib/supabase'
import type { Reel } from '../lib/types'

/**
 * 세로 스냅 릴스. 전부 목업이라 '예시 영상' 표시. 영상이 없으면 포스터, 포스터도 없으면 나이테 카드.
 * 끝에 가까워지면 목록을 한 바퀴 더 이어 붙여 계속 내려갈 수 있다(무한 스크롤).
 */
export default function ReelsPage({ active }: { active: boolean }) {
  const { t } = useI18n()
  const [reels, setReels] = useState<Reel[] | null>(null)
  const [err, setErr] = useState(false)
  const [visible, setVisible] = useState(0)
  const [rounds, setRounds] = useState(2)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && !reels) fetchReels().then(setReels, () => setErr(true)) // 탭을 처음 열 때 로드
  }, [active, reels])

  const n = reels?.length ?? 0
  useEffect(() => {
    if (n && visible >= n * rounds - 2) setRounds((r) => r + 1)
  }, [visible, n, rounds])

  useEffect(() => {
    if (!reels || !root.current) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setVisible(Number((e.target as HTMLElement).dataset.i))),
      { root: root.current, threshold: 0.6 },
    )
    root.current.querySelectorAll('[data-i]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [reels, rounds])

  if (err) return <p className="p-8 text-center text-sm text-neutral-500">{t('error')}</p>
  if (!reels) return <p className="p-8 text-center text-sm text-neutral-500">{t('loading')}</p>
  if (!reels.length) return <p className="p-8 text-center text-sm text-neutral-500">{t('reels.empty')}</p>

  return (
    <div ref={root} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto bg-black">
      {Array.from({ length: n * rounds }, (_, i) => (
        <ReelItem key={i} r={reels[i % n]} i={i} playing={active && visible === i} near={Math.abs(visible - i) <= 1} />
      ))}
    </div>
  )
}

function ReelItem({ r, i, playing, near }: { r: Reel; i: number; playing: boolean; near: boolean }) {
  const { t, lang } = useI18n()
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [playing])
  const s = r.stores
  return (
    <article data-i={i} className="relative flex h-full snap-start items-center justify-center overflow-hidden">
      {r.video_url && near ? (
        <video ref={video} src={r.video_url} poster={r.poster_url ?? undefined} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : r.poster_url || r.video_url ? (
        <img src={r.poster_url ?? undefined} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900">
          <NaiteRing years={s.years_by_license} size={180} />
        </div>
      )}
      <div className="absolute left-3 top-3">
        <span className="rounded bg-white/90 px-1.5 py-px text-[11px] text-neutral-700">{r.video_url ? t('badge.mockVideo') : t('badge.mock')}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/55 p-4 text-white">
        <div className="text-lg font-bold">{displayName(s, lang)}</div>
        <div className="text-sm text-white/85">{(lang === 'en' ? r.caption_en : r.caption_ko) ?? t('since', { year: sinceYear(s.license_date) ?? '-' })}</div>
        <Link to={`/s/${s.slug}`} className="mt-3 inline-block rounded bg-white px-4 py-2 text-sm font-semibold text-ink">
          {t('reels.view')}
        </Link>
      </div>
    </article>
  )
}
