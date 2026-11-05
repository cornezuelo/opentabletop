import { generator } from './painters'

/**
 * Tileable value noise in [0, 1] (`size` × `size`, `cells` lattice cells across), smooth and
 * the same for a seed: what wanders the terrains' borders (a displacement map) and the
 * paper's grain are made from.
 */
export function valueNoise(size: number, cells: number, seed: number): Float32Array {
  const rand = generator(seed)
  const lattice = Array.from({ length: cells * cells }, () => rand())
  const at = (i: number, j: number) =>
    lattice[((j + cells) % cells) * cells + ((i + cells) % cells)]
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const fy = (y / size) * cells
      const i = Math.floor(fx)
      const j = Math.floor(fy)
      const tx = smooth(fx - i)
      const ty = smooth(fy - j)
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx
      const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx
      out[y * size + x] = top + (bottom - top) * ty
    }
  return out
}

/** Layers of value noise, each finer and fainter (`octaves`), still tileable, in [0, 1]. */
export function fractalNoise(size: number, cells: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size)
  let weight = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise(size, cells << o, seed + o * 7919)
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * weight
    total += weight
    weight /= 2
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

/**
 * A canvas from noise: as a displacement map (red and green from two noises, so borders move
 * both ways), or as grain (a near-white paper with darker flecks and stains).
 */
export function noiseCanvas(kind: 'displacement' | 'grain', size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  if (kind === 'displacement') {
    const a = fractalNoise(size, 4, 3, 11)
    const b = fractalNoise(size, 4, 3, 23)
    for (let i = 0; i < a.length; i++) {
      image.data[i * 4] = a[i] * 255
      image.data[i * 4 + 1] = b[i] * 255
      image.data[i * 4 + 2] = 128
      image.data[i * 4 + 3] = 255
    }
  } else {
    const stains = fractalNoise(size, 3, 3, 5)
    const rand = generator(97)
    for (let i = 0; i < stains.length; i++) {
      const v = 255 - stains[i] * 60 - rand() * 35
      image.data[i * 4] = v
      image.data[i * 4 + 1] = v * 0.97
      image.data[i * 4 + 2] = v * 0.9
      image.data[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/** Smooth noise at a point of the plane, in [-1, 1]: the same everywhere for a point and a seed. */
export function noiseAt(x: number, y: number, seed: number): number {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const corner = (a: number, b: number) => {
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(seed, 982451653)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const tx = smooth(x - i)
  const ty = smooth(y - j)
  const top = corner(i, j) + (corner(i + 1, j) - corner(i, j)) * tx
  const bottom = corner(i, j + 1) + (corner(i + 1, j + 1) - corner(i, j + 1)) * tx
  return (top + (bottom - top) * ty) * 2 - 1
}

/**
 * A point moved by the noise of where it is (two octaves, `amplitude` world units at most,
 * features about `scale` across): two cells that share a side move it the same, so ragged
 * borders never open a gap.
 */
export function displace(x: number, y: number, amplitude: number, scale: number): [number, number] {
  if (amplitude <= 0) return [x, y]
  const u = x / scale
  const v = y / scale
  const dx = noiseAt(u, v, 1) * 0.7 + noiseAt(u * 2.3, v * 2.3, 2) * 0.3
  const dy = noiseAt(u, v, 3) * 0.7 + noiseAt(u * 2.3, v * 2.3, 4) * 0.3
  return [x + dx * amplitude, y + dy * amplitude]
}

/**
 * A polygon (x, y, x, y…) with each side cut in `steps` and every point moved by `displace`:
 * a cell's border wandering off its edges.
 */
export function raggedPolygon(
  points: number[],
  steps: number,
  amplitude: number,
  scale: number,
): number[] {
  if (amplitude <= 0) return points
  const out: number[] = []
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    const ax = points[i * 2]
    const ay = points[i * 2 + 1]
    const bx = points[((i + 1) % n) * 2]
    const by = points[((i + 1) % n) * 2 + 1]
    for (let k = 0; k < steps; k++)
      out.push(
        ...displace(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, amplitude, scale),
      )
  }
  return out
}
