<script lang="ts">
  import { readDrawing } from '@open-tabletop/hex'

  /** A piece as it will be laid: its cells, its exits by letter, on squares or on hexes. */
  let { cells, hex = false }: { cells: string; hex?: boolean } = $props()

  const SIZE = 16
  const layout = $derived({ kind: hex ? undefined : ('square' as const) })
  const drawn = $derived(readDrawing(cells, layout).cells)
  /** Where a cell's middle falls: rows of hexes half a cell along. */
  const at = (c: { x: number; y: number }) =>
    hex ? { x: (c.x + c.y / 2) * SIZE, y: c.y * SIZE * 0.866 } : { x: c.x * SIZE, y: c.y * SIZE }
  const shown = $derived(drawn.map((c) => ({ ...c, ...at(c), letter: /^[A-Z]$/.test(c.mark) })))
  const box = $derived.by(() => {
    const xs = shown.map((c) => c.x)
    const ys = shown.map((c) => c.y)
    const [x, y] = [Math.min(0, ...xs), Math.min(0, ...ys)]
    const [width, height] = [Math.max(0, ...xs) - x, Math.max(0, ...ys) - y]
    return `${x - SIZE} ${y - SIZE} ${width + 2 * SIZE} ${height + 2 * SIZE}`
  })
  const points = (x: number, y: number) =>
    [30, 90, 150, 210, 270, 330]
      .map((a) => {
        const r = (a * Math.PI) / 180
        return `${x + (Math.cos(r) * SIZE) / 1.73},${y + (Math.sin(r) * SIZE) / 1.73}`
      })
      .join(' ')
</script>

<svg viewBox={box} width="160" height="120" aria-hidden="true">
  {#each shown as c (`${c.x},${c.y}`)}
    {#if c.letter}
      <text x={c.x} y={c.y + 4} text-anchor="middle">{c.mark}</text>
    {:else if hex}
      <polygon points={points(c.x, c.y)} />
    {:else}
      <rect x={c.x - SIZE / 2} y={c.y - SIZE / 2} width={SIZE} height={SIZE} />
    {/if}
  {/each}
</svg>

<style>
  svg {
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  rect,
  polygon {
    fill: var(--text-muted);
    stroke: var(--panel-border);
  }

  text {
    font-size: 11px;
    font-weight: 700;
    fill: var(--accent);
  }
</style>
