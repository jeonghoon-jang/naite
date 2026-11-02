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
    <section className="overflow-hidden rounded-2xl bg-gray-50">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4.5 py-4 text-left" aria-expanded={open}>
        <span>
          <span className="block text-[15px] font-bold">{t('store.roadview')}</span>
          <span className="block text-[12px] text-gray-500">{t('store.roadviewNote')}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {none ? (
            <p className="py-6 text-center text-sm text-gray-500">{t('store.roadviewNone')}</p>
          ) : (
            !kakao.loading && (
              <KakaoRoadview
                position={{ lat, lng, radius: 60 }}
                className="h-56 w-full rounded-xl"
                onErrorGetNearestPanoId={() => setNone(true)}
                onPanoidChange={(rv) => {
                  const p = rv.getPosition()
                  rv.setViewpoint({ pan: bearing({ lat: p.getLat(), lng: p.getLng() }, { lat, lng }), tilt: 0, zoom: 0 })
                }}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
