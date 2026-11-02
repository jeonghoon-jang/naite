import { useState } from 'react'
import { Roadview as KakaoRoadview } from 'react-kakao-maps-sdk'
import { useI18n } from '../lib/i18n'
import { useKakao } from '../lib/kakao'

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const r = Math.PI / 180
  const y = Math.sin((to.lng - from.lng) * r) * Math.cos(to.lat * r)
  const x = Math.cos(from.lat * r) * Math.sin(to.lat * r) - Math.sin(from.lat * r) * Math.cos(to.lat * r) * Math.cos((to.lng - from.lng) * r)
  return ((Math.atan2(y, x) / r) + 360) % 360
}

/** 접이식 로드뷰. 펼칠 때만 SDK 로드뷰를 만들고, 가장 가까운 파노라마에서 가게 쪽을 바라보게 한다. 캡처·저장하지 않는다. */
export default function Roadview({ lat, lng }: { lat: number; lng: number }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [none, setNone] = useState(false)
  const kakao = useKakao()
  return (
    <section className="border-t border-neutral-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left font-medium" aria-expanded={open}>
        {t('store.roadview')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={open ? 'rotate-180' : ''}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {none ? (
            <p className="py-6 text-center text-sm text-neutral-500">{t('store.roadviewNone')}</p>
          ) : (
            !kakao.loading && (
              <KakaoRoadview
                position={{ lat, lng, radius: 60 }}
                className="h-56 w-full rounded"
                onErrorGetNearestPanoId={() => setNone(true)}
                onPanoidChange={(rv) => {
                  const p = rv.getPosition()
                  rv.setViewpoint({ pan: bearing({ lat: p.getLat(), lng: p.getLng() }, { lat, lng }), tilt: 0, zoom: 0 })
                }}
              />
            )
          )}
          <p className="mt-1 text-[11px] text-neutral-400">{t('store.roadviewNote')}</p>
        </div>
      )}
    </section>
  )
}
