<script lang="ts">
  import { DEFAULT_MOVES } from '@open-tabletop/weather-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'

  /**
   * A season's hex flower drawn as hexes: 19 cells in rows of 3, 4, 5, 4 and 3, each
   * coloured by its kind of weather. Pick a kind in the legend and click cells to give them
   * it. Beside it, where each 2d6 roll moves the day.
   */
  let {
    rows,
    states,
    stateName,
    moves,
    disabled = false,
    onset,
  }: {
    rows: string[][]
    states: string[]
    stateName: (id: string) => string
    /** The flower's own `moves` (absent: the default ones). */
    moves?: Record<string, string>
    disabled?: boolean
    onset: (row: number, cell: number, state: string) => void
  } = $props()

  let brush = $state('')
  const painting = $derived(states.includes(brush) ? brush : (states[0] ?? ''))

  const R = 34
  const W = Math.sqrt(3) * R
  /** Each kind its own colour, spread evenly round the wheel so no two look alike. */
  const hue = (state: string) =>
    Math.round((Math.max(0, states.indexOf(state)) * 360) / Math.max(1, states.length) + 20)
  const corners = (x: number, y: number, r = R - 1.5) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 90)
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  const cells = $derived(
    rows.flatMap((row, i) =>
      row.map((state, j) => ({
        i,
        j,
        state,
        x: ((5 - row.length) / 2) * W + j * W + W / 2,
        y: R + i * 1.5 * R,
      })),
    ),
  )
  /** A name short enough for a cell. */
  const short = (text: string) => (text.length > 9 ? `${text.slice(0, 8)}…` : text)

  /** The compass: where each direction lies from a cell, and its 2d6 totals. */
  const directions = $derived(
    (
      [
        ['ne', 0.5, -1],
        ['e', 1, 0],
        ['se', 0.5, 1],
        ['sw', -0.5, 1],
        ['w', -1, 0],
        ['nw', -0.5, -1],
      ] as const
    ).map(([dir, dx, dy]) => ({
      dir,
      x: 2 * W + dx * W,
      y: 2 * R + dy * 1.5 * R,
      range: (moves ?? DEFAULT_MOVES)[dir] ?? '',
    })),
  )
</script>

<div class="hex-flower">
  <svg
    class="cells"
    viewBox={`0 0 ${5 * W} ${8 * R}`}
    width={5 * W}
    height={8 * R}
    role="group"
    aria-label={t('weather.flower')}
  >
    {#each cells as c (`${c.i}.${c.j}`)}
      <g
        class="cell"
        class:off={disabled}
        role="button"
        tabindex={disabled ? -1 : 0}
        aria-label={`${c.i + 1}.${c.j + 1}: ${stateName(c.state)}`}
        onclick={() => !disabled && painting && onset(c.i, c.j, painting)}
        onkeydown={(e) => {
          if (disabled || !painting || (e.key !== 'Enter' && e.key !== ' ')) return
          e.preventDefault()
          onset(c.i, c.j, painting)
        }}
      >
        <polygon points={corners(c.x, c.y)} style:--hue={hue(c.state)} />
        <text x={c.x} y={c.y + 4}>{short(stateName(c.state))}</text>
      </g>
    {/each}
  </svg>

  <div class="side">
    {#if !disabled}
      <div class="legend" role="radiogroup" aria-label={t('weather.paint')}>
        <span>{t('weather.paint')}<InfoTip text={t('weather.paintHelp')} /></span>
        {#each states as s (s)}
          <label class="kind" class:chosen={s === painting}>
            <input
              type="radio"
              name="flower-brush"
              checked={s === painting}
              onchange={() => (brush = s)}
            />
            <span class="swatch" style:--hue={hue(s)}></span>
            {stateName(s)}
          </label>
        {/each}
      </div>
    {:else}
      <div class="legend">
        {#each states as s (s)}
          <span class="kind"><span class="swatch" style:--hue={hue(s)}></span>{stateName(s)}</span>
        {/each}
      </div>
    {/if}

    <div class="compass">
      <span>{t('weather.moves')}<InfoTip text={t('weather.movesHelp')} /></span>
      <svg viewBox={`0 0 ${4 * W} ${4 * R}`} width={4 * W} height={4 * R} aria-hidden="true">
        <polygon class="here" points={corners(2 * W, 2 * R, R * 0.55)} />
        {#each directions as d (d.dir)}
          <line
            x1={2 * W}
            y1={2 * R}
            x2={2 * W + (d.x - 2 * W) * 0.55}
            y2={2 * R + (d.y - 2 * R) * 0.55}
          />
          <text x={d.x} y={d.y + 4}>{d.range}</text>
        {/each}
      </svg>
    </div>
  </div>
</div>

<style>
  .hex-flower {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .cells {
    max-width: 100%;
    height: auto;
  }

  .cell polygon {
    fill: hsl(var(--hue) 40% 50% / 0.5);
    stroke: var(--panel-border);
    stroke-width: 1;
  }

  .cell:not(.off) {
    cursor: pointer;
  }

  .cell:not(.off):hover polygon,
  .cell:focus-visible polygon {
    stroke: var(--accent);
    stroke-width: 2;
  }

  .cell:focus {
    outline: none;
  }

  text {
    font-size: 11px;
    text-anchor: middle;
    fill: var(--text);
    pointer-events: none;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .legend {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .kind {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--text);
  }

  .kind input {
    margin: 0;
  }

  .kind.chosen {
    font-weight: 600;
  }

  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: hsl(var(--hue) 40% 50% / 0.5);
    border: 1px solid var(--panel-border);
  }

  .compass {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .compass .here {
    fill: var(--bg);
    stroke: var(--accent);
  }

  .compass line {
    stroke: var(--text-muted);
    stroke-width: 1;
  }
</style>
