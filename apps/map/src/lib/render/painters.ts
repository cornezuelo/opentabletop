import type { ArtMode, Painter } from '@open-tabletop/map'

/**
 * Painters: the art a style draws on a terrain's cells (docs/map-styles.md §4), as shapes
 * the renderer strokes and fills. Pure and deterministic: a cell's seed (its coordinates
 * hashed) always gives the same drawing, unlike the next cell's, with no RandomSource
 * (it isn't play).
 */

/** A polygon or line: its points (x, y, x, y…), filled and/or stroked. */
export interface Shape {
  points: number[]
  closed: boolean
  fill?: number
  fillAlpha?: number
  stroke?: number
  /** Stroke width in world units. */
  width?: number
  strokeAlpha?: number
}

export interface PaintInput {
  /** The cell's centre and its radius (centre to corner), in world units. */
  x: number
  y: number
  r: number
  seed: number
  mode: ArtMode
  /** The lines' colour (ink mode). */
  ink: number
  /** The art's colour: the terrain's as drawn (washed or not), or the style's own. */
  base: number
  /** How many things, and how big (1 the usual). */
  density: number
  size: number
}

/** A seed from a cell's key (`3,7`): the same key, the same drawing. */
export function seedOf(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A small seeded generator (mulberry32): numbers in [0, 1). */
export function generator(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A colour lighter (amount > 0, towards white) or darker (< 0, towards black). */
export function shade(color: number, amount: number): number {
  const to = amount > 0 ? 255 : 0
  const t = Math.min(1, Math.abs(amount))
  const ch = (shift: number) => {
    const c = (color >> shift) & 0xff
    return Math.round(c + (to - c) * t)
  }
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

/** Two colours mixed: `t` 0 is `a`, 1 is `b`. */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const x = (a >> shift) & 0xff
    const y = (b >> shift) & 0xff
    return Math.round(x + (y - x) * t)
  }
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

/**
 * Where a cell's `n` images stand (a style drawing a terrain with images): one in the
 * middle, more spread over the cell like a painter's things, the higher first.
 */
export function stampSpots(seed: number, n: number, r: number, x: number, y: number) {
  return n <= 1 ? [{ x, y }] : spots(generator(seed), n, r, x, y, 0.55)
}

/**
 * Up to `n` points inside the cell (a circle of `reach` radii), kept apart from each other,
 * the higher ones first so the lower are drawn over them.
 */
function spots(rand: () => number, n: number, r: number, x: number, y: number, reach = 0.72) {
  const out: { x: number; y: number }[] = []
  const apart = (r * reach * 1.6) / Math.sqrt(Math.max(1, n))
  for (let tries = 0; out.length < n && tries < n * 12; tries++) {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * r * reach
    const p = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }
    if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= apart)) out.push(p)
  }
  return out.sort((a, b) => a.y - b.y)
}

const count = (n: number, density: number) => Math.max(0, Math.round(n * density))

/** A body: in ink, the ground's colour edged with ink; painted, its colour with a dark edge. */
function body(points: number[], input: PaintInput, fill: number, line = 0.022): Shape {
  const ink = input.mode === 'ink'
  return {
    points,
    closed: true,
    fill: ink ? input.base : fill,
    stroke: ink ? input.ink : shade(fill, -0.55),
    width: input.r * (ink ? line : line * 0.5),
    strokeAlpha: ink ? 0.95 : 0.6,
  }
}

/** A line: ink, or a darker shade of the art's colour. */
function line(points: number[], input: PaintInput, width = 0.02, alpha = 0.8): Shape {
  const ink = input.mode === 'ink'
  return {
    points,
    closed: false,
    stroke: ink ? input.ink : shade(input.base, -0.35),
    width: input.r * width,
    strokeAlpha: alpha,
  }
}

/** A soft shadow cast to the lower right (painted only). */
function shadow(x: number, y: number, w: number, h: number, input: PaintInput): Shape[] {
  if (input.mode === 'ink') return []
  const pts: number[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    pts.push(x + w * 0.3 + Math.cos(a) * w, y + Math.sin(a) * h)
  }
  return [{ points: pts, closed: true, fill: 0x000000, fillAlpha: 0.18 }]
}

function conifer(x: number, y: number, s: number, input: PaintInput): Shape[] {
  const h = 0.46 * s
  const w = 0.28 * s
  const outline = [
    [x, y - h],
    [x + w * 0.45, y - h * 0.48],
    [x + w * 0.22, y - h * 0.5],
    [x + w * 0.6, y - h * 0.05],
    [x - w * 0.6, y - h * 0.05],
    [x - w * 0.22, y - h * 0.5],
    [x - w * 0.45, y - h * 0.48],
  ].flat()
  const fill = shade(input.base, -0.12)
  const shapes = [
    ...shadow(x, y, w * 0.5, w * 0.16, input),
    line([x, y - h * 0.05, x, y + 0.05 * s], input, 0.03, 1),
    body(outline, input, fill),
  ]
  // The lit side, to the upper left.
  if (input.mode === 'painted')
    shapes.push({
      points: [
        x,
        y - h,
        x - w * 0.45,
        y - h * 0.48,
        x - w * 0.22,
        y - h * 0.5,
        x - w * 0.6,
        y - h * 0.05,
        x,
        y - h * 0.05,
      ],
      closed: true,
      fill: shade(fill, 0.22),
    })
  return shapes
}

function broadleaf(x: number, y: number, s: number, input: PaintInput, rand: () => number) {
  const rr = 0.16 * s
  const cx = x
  const cy = y - 0.24 * s
  const crown: number[] = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + (i % 2 ? 0.14 : -0.04) + (rand() - 0.5) * 0.12
    crown.push(cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k * 0.9)
  }
  const fill = shade(input.base, -0.08)
  const shapes = [
    ...shadow(x, y, rr * 0.8, rr * 0.25, input),
    line([x, cy + rr * 0.6, x, y], input, 0.03, 1),
    body(crown, input, fill),
  ]
  if (input.mode === 'painted') {
    const lit: number[] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      lit.push(cx - rr * 0.3 + Math.cos(a) * rr * 0.45, cy - rr * 0.3 + Math.sin(a) * rr * 0.4)
    }
    shapes.push({ points: lit, closed: true, fill: shade(fill, 0.25), fillAlpha: 0.8 })
  }
  return shapes
}

function hill(x: number, y: number, s: number, input: PaintInput): Shape[] {
  const w = 0.34 * s
  const h = 0.24 * s
  const arc: number[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    arc.push(x - w + 2 * w * t, y - Math.sin(t * Math.PI) * h)
  }
  const fill = shade(input.base, 0.06)
  const shapes: Shape[] = [...shadow(x, y, w * 0.8, h * 0.25, input), body(arc, input, fill)]
  if (input.mode === 'painted') {
    const dark: number[] = [x + w * 0.1, y - h * 0.98]
    for (let i = 7; i <= 12; i++) {
      const t = i / 12
      dark.push(x - w + 2 * w * t, y - Math.sin(t * Math.PI) * h)
    }
    dark.push(x + w * 0.2, y)
    shapes.push({ points: dark, closed: true, fill: shade(fill, -0.25), fillAlpha: 0.85 })
  } else
    for (let i = 1; i <= 2; i++) {
      const t = 0.62 + i * 0.1
      const px = x - w + 2 * w * t
      const py = y - Math.sin(t * Math.PI) * h
      shapes.push(line([px, py + h * 0.12, px - w * 0.12, y - h * 0.08], input, 0.016, 0.7))
    }
  return shapes
}

function mountain(
  x: number,
  y: number,
  s: number,
  input: PaintInput,
  rand: () => number,
  top: 'plain' | 'snow' | 'crater',
): Shape[] {
  const w = 0.42 * s
  const h = 0.72 * s
  const apex = { x: x + (rand() - 0.5) * w * 0.3, y: y - h }
  const foot = { x: x + w * (0.05 + rand() * 0.15), y }
  const flat = top === 'crater' ? w * 0.12 : 0
  const outline = [
    x - w,
    y,
    apex.x - w * 0.35,
    y - h * 0.55,
    apex.x - flat,
    apex.y,
    apex.x + flat,
    apex.y,
    x + w,
    y,
  ]
  const fill = shade(input.base, 0.05)
  const shapes: Shape[] = [
    ...shadow(x, y, w * 0.9, w * 0.18, input),
    body(outline, input, fill, 0.026),
  ]
  if (input.mode === 'painted') {
    shapes.push({
      points: [apex.x + flat, apex.y, x + w, y, foot.x, foot.y],
      closed: true,
      fill: shade(fill, -0.3),
    })
    shapes.push({
      points: [
        apex.x - w * 0.35,
        y - h * 0.55,
        apex.x - flat,
        apex.y,
        foot.x,
        foot.y,
        x - w * 0.55,
        y,
      ],
      closed: true,
      fill: shade(fill, 0.2),
      fillAlpha: 0.7,
    })
  } else {
    // Hatching on the shaded face.
    for (let i = 1; i <= 4; i++) {
      const t = i / 5
      const px = apex.x + flat + (x + w - apex.x - flat) * t
      const py = apex.y + (y - apex.y) * t
      shapes.push(
        line([px, py, px - w * 0.18 * (1 - t * 0.4), py + h * 0.22 * (1 - t)], input, 0.016, 0.75),
      )
    }
    shapes.push(line([apex.x + flat, apex.y, foot.x, foot.y], input, 0.016, 0.6))
  }
  if (top === 'snow')
    shapes.push({
      points: [
        apex.x - flat,
        apex.y,
        apex.x - w * 0.2,
        apex.y + h * 0.26,
        apex.x - w * 0.05,
        apex.y + h * 0.2,
        apex.x + w * 0.04,
        apex.y + h * 0.3,
        apex.x + w * 0.2,
        apex.y + h * 0.26,
      ],
      closed: true,
      fill: 0xf4f4f0,
      stroke: input.mode === 'ink' ? input.ink : undefined,
      width: input.r * 0.012,
    })
  if (top === 'crater') {
    shapes.push({
      points: [apex.x - flat, apex.y, apex.x, apex.y + h * 0.05, apex.x + flat, apex.y],
      closed: false,
      stroke: input.mode === 'ink' ? input.ink : 0xd2482a,
      width: input.r * 0.03,
    })
    // Smoke rising.
    const smoke: number[] = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      smoke.push(apex.x + Math.sin(t * Math.PI * 2) * w * 0.1, apex.y - t * h * 0.35)
    }
    shapes.push(line(smoke, { ...input, base: 0x777777 }, 0.018, 0.6))
  }
  return shapes
}

type Draw = (input: PaintInput, rand: () => number) => Shape[]

const PAINT: Record<Painter, Draw> = {
  grass(input, rand) {
    const { x, y, r, size } = input
    const s = r * size
    return spots(rand, count(5, input.density), r, x, y, 0.75).flatMap((p) => {
      const h = 0.09 * s * (0.8 + rand() * 0.4)
      return [
        line([p.x - 0.05 * s, p.y - h * 0.8, p.x, p.y], input, 0.016, 0.7),
        line([p.x, p.y - h, p.x, p.y], input, 0.016, 0.7),
        line([p.x + 0.05 * s, p.y - h * 0.8, p.x, p.y], input, 0.016, 0.7),
      ]
    })
  },
  farmland(input, rand) {
    const { x, y, r } = input
    const angle = rand() * Math.PI
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const n = count(4, input.density)
    const shapes: Shape[] = []
    for (let i = 0; i < n; i++) {
      const off = ((i + 0.5) / n - 0.5) * r * 1.2
      const cx = x - dy * off
      const cy = y + dx * off
      const half = r * 0.55 * Math.sqrt(1 - (off / r) ** 2 * 0.6)
      shapes.push(
        line([cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half], input, 0.018, 0.55),
      )
    }
    return shapes
  },
  conifers(input, rand) {
    const s = input.r * input.size
    return spots(rand, count(7, input.density), input.r, input.x, input.y + input.r * 0.15).flatMap(
      (p) => conifer(p.x, p.y, s * (0.8 + rand() * 0.35), input),
    )
  },
  broadleaf(input, rand) {
    const s = input.r * input.size
    return spots(rand, count(6, input.density), input.r, input.x, input.y + input.r * 0.15).flatMap(
      (p) => broadleaf(p.x, p.y, s * (0.85 + rand() * 0.3), input, rand),
    )
  },
  forest(input, rand) {
    const s = input.r * input.size
    return spots(
      rand,
      count(10, input.density),
      input.r,
      input.x,
      input.y + input.r * 0.15,
      0.8,
    ).flatMap((p) =>
      rand() < 0.55
        ? conifer(p.x, p.y, s * (0.75 + rand() * 0.3), input)
        : broadleaf(p.x, p.y, s * (0.75 + rand() * 0.3), input, rand),
    )
  },
  reeds(input, rand) {
    const { x, y, r, size } = input
    const s = r * size
    return spots(rand, count(5, input.density), r, x, y, 0.7).flatMap((p) => {
      const out = [line([p.x - 0.1 * s, p.y, p.x + 0.1 * s, p.y], input, 0.016, 0.6)]
      for (const dx of [-0.04, 0, 0.04])
        out.push(
          line(
            [p.x + dx * s, p.y, p.x + dx * s * 1.3, p.y - (0.1 + rand() * 0.05) * s],
            input,
            0.016,
            0.8,
          ),
        )
      return out
    })
  },
  hills(input, rand) {
    const s = input.r * input.size
    return spots(
      rand,
      count(3, input.density),
      input.r,
      input.x,
      input.y + input.r * 0.2,
      0.6,
    ).flatMap((p) => hill(p.x, p.y, s * (0.8 + rand() * 0.35), input))
  },
  mountains(input, rand) {
    const s = input.r * input.size
    const n = count(2, input.density)
    const out: Shape[] = []
    // Smaller ones behind, the big one in front.
    for (let i = 1; i < n; i++)
      out.push(
        ...mountain(
          input.x + (rand() - 0.5) * input.r,
          input.y - input.r * 0.05,
          s * 0.6,
          input,
          rand,
          'plain',
        ),
      )
    if (n > 0) out.push(...mountain(input.x, input.y + input.r * 0.45, s, input, rand, 'plain'))
    return out
  },
  peaks(input, rand) {
    const s = input.r * input.size
    const n = count(2, input.density)
    const out: Shape[] = []
    for (let i = 1; i < n; i++)
      out.push(
        ...mountain(
          input.x + (rand() - 0.5) * input.r,
          input.y - input.r * 0.05,
          s * 0.65,
          input,
          rand,
          'snow',
        ),
      )
    if (n > 0)
      out.push(...mountain(input.x, input.y + input.r * 0.45, s * 1.1, input, rand, 'snow'))
    return out
  },
  volcano(input, rand) {
    if (count(1, input.density) === 0) return []
    return mountain(input.x, input.y + input.r * 0.45, input.r * input.size, input, rand, 'crater')
  },
  dunes(input, rand) {
    const { x, y, r, size } = input
    const s = r * size
    return spots(rand, count(3, input.density), r, x, y, 0.6).map((p) => {
      const pts: number[] = []
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        pts.push(
          p.x - 0.22 * s + 0.44 * s * t,
          p.y - Math.sin(t * Math.PI) * 0.08 * s * (1 - t * 0.5),
        )
      }
      return line(pts, input, 0.018, 0.65)
    })
  },
  rocks(input, rand) {
    const { x, y, r, size } = input
    const s = r * size
    return spots(rand, count(5, input.density), r, x, y, 0.7).map((p) => {
      const pts: number[] = []
      const n = 5
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.6
        const k = (0.05 + rand() * 0.04) * s
        pts.push(p.x + Math.cos(a) * k, p.y + Math.sin(a) * k * 0.7)
      }
      return body(pts, input, shade(input.base, -0.1), 0.016)
    })
  },
  waves(input, rand) {
    const { x, y, r, size } = input
    const s = r * size
    const painted = input.mode === 'painted'
    return spots(rand, count(4, input.density), r, x, y, 0.65).map((p) => {
      const pts: number[] = []
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        pts.push(
          p.x - 0.14 * s + 0.28 * s * t,
          p.y - Math.abs(Math.sin(t * Math.PI * 2)) * 0.035 * s,
        )
      }
      return {
        points: pts,
        closed: false,
        stroke: painted ? shade(input.base, 0.35) : input.ink,
        width: r * 0.016,
        strokeAlpha: painted ? 0.55 : 0.45,
      }
    })
  },
  cobbles(input, rand) {
    // Rounded stones in staggered rows across the cell, as a paved street.
    const { x, y, r } = input
    if (input.density <= 0) return []
    const size = ((r * 0.2) / Math.sqrt(input.density)) * input.size
    const reach = r * 0.66
    const painted = input.mode === 'painted'
    const shapes: Shape[] = []
    let row = 0
    for (let py = y - reach + size / 2; py <= y + reach; py += size * 0.9, row++)
      for (let px = x - reach + (row % 2 ? size / 2 : 0); px <= x + reach; px += size) {
        const pts: number[] = []
        const k = size * (0.38 + rand() * 0.06)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + rand() * 0.4
          pts.push(px + Math.cos(a) * k, py + Math.sin(a) * k * 0.85)
        }
        shapes.push(
          painted
            ? { points: pts, closed: true, fill: shade(input.base, (rand() - 0.5) * 0.24) }
            : {
                points: pts,
                closed: true,
                stroke: input.ink,
                width: r * 0.012,
                strokeAlpha: 0.45,
              },
        )
      }
    return shapes
  },
  dots(input, rand) {
    const { x, y, r } = input
    return spots(rand, count(14, input.density), r, x, y, 0.8).map((p) => {
      const k = r * 0.018 * input.size
      return {
        points: [p.x - k, p.y, p.x, p.y - k, p.x + k, p.y, p.x, p.y + k],
        closed: true,
        fill: input.mode === 'ink' ? input.ink : shade(input.base, -0.3),
        fillAlpha: 0.5,
      }
    })
  },
}

/** What a painter draws on one cell. */
export function paint(painter: Painter, input: PaintInput): Shape[] {
  return PAINT[painter](input, generator(input.seed))
}

/** A style's colour (`#rrggbb` or `#rgb`) as a number. */
export function colorOf(hex: string): number {
  const h = hex.slice(1)
  return parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16)
}
