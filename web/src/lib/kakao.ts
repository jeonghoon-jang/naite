import { useKakaoLoader } from 'react-kakao-maps-sdk'

export const HONGDAE = { lat: 37.5572, lng: 126.9245 }
export const RADIUS_M = 1800

/** 카카오맵 SDK 로드. 지도·로드뷰는 표시만 하고 데이터는 저장하지 않는다. */
export function useKakao() {
  const [loading, error] = useKakaoLoader({ appkey: import.meta.env.VITE_KAKAO_JS_KEY as string })
  return { loading, error }
}
