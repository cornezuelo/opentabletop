/**
 * A throw of dice across a table, as plain numbers (docs/dice.md): each die thrown with a
 * speed and a spin, bouncing off the table's edges and off each other, slowed by the cloth
 * until it stops. Pure and step by step, so a component draws it frame by frame and a test
 * plays it to the end. Randomness comes from `random` (a number in [0, 1)), never inside.
 */

/** One die on the table. */
export interface ThrownDie {
  x: number
  y: number
  vx: number
  vy: number
  /** Its turn, in degrees, and how fast it spins (degrees a second). */
  angle: number
  spin: number
  /** How high it is off the table (it falls, and hops on a bounce), drawn as its size. */
  z: number
  vz: number
  /** Faces it has shown so far: one more each time it turns over (a bounce, a quarter spin). */
  turns: number
  /** Whether it has stopped. */
  still: boolean
}

export interface Table {
  width: number
  height: number
  /** A die's size (its square's side). */
  size: number
}

/** What a step of the throw did: which dice hit an edge or each other (for a sound). */
export interface ThrowStep {
  dice: ThrownDie[]
  /** How hard the hardest knock was, 0 to 1 (0: none). */
  knock: number
}

/** How the cloth slows a die, a second at a time (a share of its speed kept). */
const FRICTION = 0.32
/** What a die keeps of its speed bouncing off an edge, or another die. */
const BOUNCE = 0.62
const GRAVITY = 2400
/** Below this speed a die on the table stops. */
const REST = 18

/**
 * The dice as they leave the hand: from `from` (where the throw began, the table's lower
 * middle by default) at `velocity` (pixels a second; a drag's, or a throw of its own), each a
 * little apart and its own spin.
 */
export function startThrow(
  count: number,
  table: Table,
  random: () => number,
  velocity?: { x: number; y: number },
  from?: { x: number; y: number },
): ThrownDie[] {
  const speed = velocity ?? {
    x: (random() - 0.5) * 900,
    y: -(900 + random() * 700),
  }
  const start = from ?? { x: table.width / 2, y: table.height - table.size }
  return Array.from({ length: count }, (_, i) => ({
    x: clamp(
      start.x + (i - (count - 1) / 2) * table.size * 1.1,
      table.size / 2,
      table.width - table.size / 2,
    ),
    y: clamp(start.y, table.size / 2, table.height - table.size / 2),
    vx: speed.x * (0.85 + random() * 0.3) + (random() - 0.5) * 160,
    vy: speed.y * (0.85 + random() * 0.3) + (random() - 0.5) * 160,
    angle: random() * 360,
    spin: (random() < 0.5 ? -1 : 1) * (500 + random() * 700),
    z: table.size * 1.4,
    vz: 300 + random() * 300,
    turns: 0,
    still: false,
  }))
}

/** The throw `dt` seconds later (small steps: a frame's). */
export function stepThrow(dice: readonly ThrownDie[], table: Table, dt: number): ThrowStep {
  let knock = 0
  const half = table.size / 2
  const next = dice.map((d) => {
    if (d.still) return d
    const n = { ...d }
    // In the air it falls; on the table it hops a little on a knock.
    n.vz -= GRAVITY * dt
    n.z += n.vz * dt
    if (n.z <= 0) {
      if (n.vz < -120) {
        knock = Math.max(knock, Math.min(1, -n.vz / 900))
        n.turns++
      }
      n.z = 0
      n.vz = -n.vz * 0.35
      if (n.vz < 60) n.vz = 0
    }
    const onTable = n.z === 0
    const keep = Math.pow(onTable ? FRICTION : 0.9, dt)
    n.vx *= keep
    n.vy *= keep
    n.spin *= Math.pow(onTable ? 0.25 : 0.95, dt)
    const before = Math.floor(n.angle / 90)
    n.angle += n.spin * dt
    if (Math.floor(n.angle / 90) !== before) n.turns++
    n.x += n.vx * dt
    n.y += n.vy * dt
    // The table's edges.
    for (const [axis, v, max] of [
      ['x', 'vx', table.width],
      ['y', 'vy', table.height],
    ] as const) {
      if (n[axis] < half || n[axis] > max - half) {
        n[axis] = clamp(n[axis], half, max - half)
        knock = Math.max(knock, Math.min(1, Math.abs(n[v]) / 1400))
        n[v] = -n[v] * BOUNCE
        n.spin = -n.spin * 0.7 + n[v] * 0.3
        n.turns++
      }
    }
    if (onTable && Math.hypot(n.vx, n.vy) < REST && n.vz === 0) {
      n.vx = 0
      n.vy = 0
      n.spin = 0
      n.still = true
    }
    return n
  })
  // Dice knocking into each other: pushed apart, their speeds traded along the knock.
  for (let i = 0; i < next.length; i++)
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i]!
      const b = next[j]!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.hypot(dx, dy) || 0.01
      if (distance >= table.size) continue
      const nx = dx / distance
      const ny = dy / distance
      const push = (table.size - distance) / 2
      next[i] = { ...a, x: a.x - nx * push, y: a.y - ny * push }
      next[j] = { ...b, x: b.x + nx * push, y: b.y + ny * push }
      const along = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (along >= 0) continue
      const impulse = -along * BOUNCE
      knock = Math.max(knock, Math.min(1, impulse / 1400))
      const ai = next[i]!
      const bi = next[j]!
      next[i] = {
        ...ai,
        vx: ai.vx - impulse * nx,
        vy: ai.vy - impulse * ny,
        still: false,
        turns: ai.turns + 1,
      }
      next[j] = {
        ...bi,
        vx: bi.vx + impulse * nx,
        vy: bi.vy + impulse * ny,
        still: false,
        turns: bi.turns + 1,
      }
    }
  // A knock never pushes a die off the table.
  const kept = next.map((d) => ({
    ...d,
    x: clamp(d.x, half, table.width - half),
    y: clamp(d.y, half, table.height - half),
  }))
  return { dice: kept, knock }
}

/** Whether every die has stopped. */
export const settled = (dice: readonly ThrownDie[]) => dice.every((d) => d.still)

/**
 * Plays a throw to its end, a frame at a time (at most `limit` seconds: a die still rolling
 * then is stopped where it is): every frame, for a test or to know how long it takes.
 */
export function playThrow(
  dice: readonly ThrownDie[],
  table: Table,
  { dt = 1 / 60, limit = 6 }: { dt?: number; limit?: number } = {},
): ThrowStep[] {
  const frames: ThrowStep[] = []
  let now = dice
  for (let t = 0; t < limit && !settled(now); t += dt) {
    const step = stepThrow(now, table, dt)
    frames.push(step)
    now = step.dice
  }
  if (!settled(now))
    frames.push({
      dice: now.map((d) => ({ ...d, vx: 0, vy: 0, spin: 0, z: 0, vz: 0, still: true })),
      knock: 0,
    })
  return frames
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
