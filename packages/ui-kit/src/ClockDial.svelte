<script lang="ts">
  /**
   * A progress clock drawn round, one wedge per segment (as in Blades in the Dark), the
   * filled ones in the accent colour. With `onfill`, clicking a wedge fills up to it, and
   * clicking the last filled one empties it; without it, it only shows.
   */
  let {
    segments,
    filled,
    size = 48,
    label,
    onfill,
  }: {
    segments: number
    filled: number
    size?: number
    /** What it is called, for screen readers (the count is added). */
    label: string
    /** Asked to fill `n` segments (0 to `segments`). */
    onfill?: (n: number) => void
  } = $props()

  const n = $derived(Math.max(1, Math.round(segments)))
  const full = $derived(filled >= n)
  const r = 46
  /** The wedge of segment `i`, clockwise from the top. */
  function wedge(i: number): string {
    if (n === 1) return `M 50 4 A ${r} ${r} 0 1 1 49.99 4 Z`
    const at = (k: number) => {
      const a = (k / n) * 2 * Math.PI - Math.PI / 2
      return `${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}`
    }
    return `M 50 50 L ${at(i)} A ${r} ${r} 0 0 1 ${at(i + 1)} Z`
  }
  const target = (i: number) => (i + 1 === filled ? i : i + 1)
</script>

<svg
  class="dial"
  class:full
  width={size}
  height={size}
  viewBox="0 0 100 100"
  role="group"
  aria-label={`${label}: ${filled}/${n}`}
>
  {#each Array.from({ length: n }, (_, i) => i) as i (i)}
    {#if onfill}
      <path
        d={wedge(i)}
        class="wedge"
        class:on={i < filled}
        role="button"
        tabindex="0"
        aria-label={`${i + 1}/${n}`}
        onclick={() => onfill(target(i))}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onfill(target(i))
          }
        }}
      />
    {:else}
      <path d={wedge(i)} class="wedge" class:on={i < filled} />
    {/if}
  {/each}
  <circle cx="50" cy="50" {r} class="rim" />
</svg>

<style>
  .dial {
    flex: none;
    overflow: visible;
  }

  .wedge {
    fill: var(--bg);
    stroke: var(--panel-border);
    stroke-width: 2.5;
    stroke-linejoin: round;
    transition: fill 0.12s;
  }

  .wedge[role='button'] {
    cursor: pointer;
  }

  .wedge[role='button']:hover {
    fill: color-mix(in srgb, var(--accent) 35%, var(--bg));
  }

  .wedge.on,
  .wedge.on[role='button']:hover {
    fill: var(--accent);
  }

  .wedge:focus-visible {
    outline: none;
    stroke: var(--text);
  }

  .rim {
    fill: none;
    stroke: var(--text-muted);
    stroke-width: 3;
    pointer-events: none;
  }

  .full .rim {
    stroke: var(--accent);
    stroke-width: 5;
  }
</style>
