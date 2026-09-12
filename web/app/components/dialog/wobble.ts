// Port of the bubble generator (chat-bubble.html) at its default settings —
// wobble 19, smoothness 6, corner 45, speed 1 — with the canvas shortened so
// the inner rectangle has the bubble's 974:201 aspect ratio.
const W = 1200
const H = 295
const PAD = 30
const SEED = 7
const WOBBLE = 19
const SMOOTH = 6
const CORNER = 45

export const WOBBLE_CANVAS = { width: W, height: H, pad: PAD }

function rand(i: number) {
  const x = Math.sin(SEED * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function basePoint(t: number, r: number): [number, number] {
  const w = W - 2 * PAD
  const h = H - 2 * PAD
  const sw = w - 2 * r
  const sh = h - 2 * r
  const arc = (Math.PI * r) / 2
  const total = 2 * sw + 2 * sh + 4 * arc
  let d = t * total
  const x0 = PAD
  const y0 = PAD
  if (d < sw) return [x0 + r + d, y0]
  d -= sw
  if (d < arc) {
    const a = -Math.PI / 2 + d / r
    return [x0 + w - r + r * Math.cos(a), y0 + r + r * Math.sin(a)]
  }
  d -= arc
  if (d < sh) return [x0 + w, y0 + r + d]
  d -= sh
  if (d < arc) {
    const a = d / r
    return [x0 + w - r + r * Math.cos(a), y0 + h - r + r * Math.sin(a)]
  }
  d -= arc
  if (d < sw) return [x0 + w - r - d, y0 + h]
  d -= sw
  if (d < arc) {
    const a = Math.PI / 2 + d / r
    return [x0 + r + r * Math.cos(a), y0 + h - r + r * Math.sin(a)]
  }
  d -= arc
  if (d < sh) return [x0, y0 + h - r - d]
  d -= sh
  const a = Math.PI + d / r
  return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a)]
}

// Travelling waves around the perimeter, each seeded with its own lobe count,
// speed and direction, so the edge keeps slowly morphing without repeating.
const waves = Array.from({ length: 4 }, (_, k) => ({
  lobes: 1 + Math.floor(rand(k) * 5),
  speed: (0.1 + rand(k + 10) * 0.25) * (rand(k + 20) < 0.5 ? -1 : 1),
  phase: rand(k + 30) * Math.PI * 2,
  amp: 1 / (k + 1),
}))

function noise(t: number, time: number) {
  let v = 0
  let total = 0
  for (const w of waves) {
    v += w.amp * Math.sin(t * Math.PI * 2 * w.lobes + w.phase + time * w.speed * Math.PI * 2)
    total += w.amp
  }
  return v / total
}

// `time` is in seconds. Deterministic, so the server-rendered path at t=0
// matches the first client frame and hydration stays clean.
export function buildWobblePath(time: number): string {
  const n = 12 + SMOOTH * 4
  const cx = W / 2
  const cy = H / 2
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = i / n
    const [x, y] = basePoint(t, CORNER)
    const dx = x - cx
    const dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    const off = noise(t, time) * WOBBLE
    pts.push([x + (dx / len) * off, y + (dy / len) * off])
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + " Z"
}
