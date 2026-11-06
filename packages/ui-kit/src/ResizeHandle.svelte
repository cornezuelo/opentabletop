<script lang="ts">
  /**
   * The edge of a column, dragged to widen it (or with the arrow keys). The column is on the
   * handle's right unless `side` says left; the host keeps `value` and places the handle.
   */
  let {
    value,
    min,
    max,
    label,
    side = 'right',
    onchange,
  }: {
    value: number
    min: number
    max: number
    label: string
    side?: 'left' | 'right'
    onchange: (value: number) => void
  } = $props()

  const clamp = (n: number) => Math.round(Math.min(max, Math.max(min, n)))
  let from: { x: number; value: number } | null = null

  function down(e: PointerEvent) {
    from = { x: e.clientX, value }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (!from) return
    const moved = e.clientX - from.x
    onchange(clamp(from.value + (side === 'right' ? -moved : moved)))
  }
  function key(e: KeyboardEvent) {
    const step = e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0
    if (!step) return
    e.preventDefault()
    onchange(clamp(value + (side === 'right' ? -step : step)))
  }
</script>

<!-- A focusable separator is a control (WAI-ARIA window splitter). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="handle"
  role="separator"
  tabindex="0"
  aria-orientation="vertical"
  aria-label={label}
  aria-valuenow={value}
  aria-valuemin={min}
  aria-valuemax={max}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={() => (from = null)}
  onkeydown={key}
></div>

<style>
  .handle {
    width: 6px;
    height: 100%;
    cursor: col-resize;
    touch-action: none;
  }

  .handle:hover,
  .handle:focus-visible {
    background: var(--accent);
    outline: none;
  }
</style>
