/** 나무 나이테처럼 살짝 불규칙한 닫힌 곡선(SVG path). seed 가 같으면 항상 같은 모양. */
export function ringPath(cx: number, cy: number, r: number, seed: number, amp = 0.04, n = 48): string {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const k = 1 + amp * (Math.sin(3 * t + seed) * 0.5 + Math.sin(5 * t + seed * 2.1) * 0.3 + Math.sin(2 * t + seed * 1.7) * 0.2)
    pts.push([cx + r * k * Math.cos(t), cy + r * k * Math.sin(t)])
  }
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + ' Z'
}
