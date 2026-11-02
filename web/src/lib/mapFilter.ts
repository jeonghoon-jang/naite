import type { Cat, Decade } from './category'

export type MapFilter = {
  cat: Cat | null
  decade: Decade | null
  saved: boolean
  model: boolean
  min: 0 | 40
  q: string
  sort: 'old' | 'near'
  view: 'map' | 'list'
}

export const EMPTY_FILTER: MapFilter = { cat: null, decade: null, saved: false, model: false, min: 0, q: '', sort: 'old', view: 'map' }

// 홈의 칩·배너가 지도 탭을 특정 필터로 열 때 쓴다. 지도 탭이 활성화될 때 한 번 꺼내 간다.
let pending: Partial<MapFilter> | null = null
export const setPendingFilter = (f: Partial<MapFilter>) => {
  pending = f
}
export const takePendingFilter = () => {
  const p = pending
  pending = null
  return p
}
