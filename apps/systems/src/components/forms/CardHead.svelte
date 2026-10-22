<script lang="ts" module>
  /**
   * A card whose place in its list decides something (checks, factions, ways of
   * travelling, actions): its place, a handle to drag it onto another card and ↑ ↓.
   */
  export interface CardOrder {
    /** Its place in the list, from 0. */
    index: number
    count: number
    /** What a drag carries, one kind per list: cards are only dropped in their own list. */
    list: string
    /** Moves it `by` places (−1 up, 1 down). */
    onmove: (by: number) => void
    /** Another card of the same list dropped on this one, by its place. */
    ondrop: (from: number) => void
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'

  /**
   * A foldable card's head: its name, its id and a line saying what it does; a click folds
   * or unfolds it. Buttons of its own (remove) go beside it. Where order decides
   * something, its place, a handle (⠿) to drag it onto another card and ↑ ↓.
   */
  let {
    title,
    id,
    said,
    open,
    ontoggle,
    order,
    disabled = false,
    children,
  }: {
    title: string
    id: string
    said?: string
    open: boolean
    ontoggle: () => void
    order?: CardOrder
    /** Read-only: the place is shown, but nothing moves. */
    disabled?: boolean
    children?: Snippet
  } = $props()

  const DRAG = $derived(`application/x-opentabletop-${order?.list ?? 'card'}`)
  /** Another card of the list dragged over this one. */
  let over = $state(false)
  function dragStart(e: DragEvent) {
    if (!order) return
    e.dataTransfer?.setData(DRAG, String(order.index))
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }
  function dragOver(e: DragEvent) {
    if (!order || disabled || !e.dataTransfer?.types.includes(DRAG)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    over = true
  }
  function drop(e: DragEvent) {
    over = false
    if (!order || disabled || !e.dataTransfer?.types.includes(DRAG)) return
    const from = Number(e.dataTransfer.getData(DRAG))
    if (!Number.isInteger(from)) return
    e.preventDefault()
    if (from !== order.index) order.ondrop(from)
  }
</script>

<div
  class="head"
  class:over
  role="group"
  ondragover={dragOver}
  ondragleave={() => (over = false)}
  ondrop={drop}
>
  {#if order && !disabled}
    <span
      class="grip"
      role="button"
      tabindex="-1"
      aria-label={t('forms.drag')}
      draggable="true"
      ondragstart={dragStart}
      use:tooltip={t('forms.drag')}>⠿</span
    >
  {/if}
  <button
    class="title"
    aria-expanded={open}
    use:tooltip={open ? t('forms.fold') : t('forms.unfold')}
    onclick={ontoggle}
  >
    <span class="arrow">{open ? '▾' : '▸'}</span>
    {#if order}<span class="place">{order.index + 1}.</span>{/if}
    <strong>{title}</strong>
    {#if id !== title}<code>{id}</code>{/if}
    {#if said}<small>{said}</small>{/if}
  </button>
  {#if order && !disabled}
    <button
      class="icon"
      aria-label={t('actions.up')}
      use:tooltip={t('actions.up')}
      disabled={order.index === 0}
      onclick={() => order.onmove(-1)}>↑</button
    >
    <button
      class="icon"
      aria-label={t('actions.down')}
      use:tooltip={t('actions.down')}
      disabled={order.index === order.count - 1}
      onclick={() => order.onmove(1)}>↓</button
    >
  {/if}
  {@render children?.()}
</div>

<style>
  .head {
    display: flex;
    gap: 4px;
    align-items: center;
    border-radius: 4px;
  }

  .head.over {
    box-shadow: 0 -2px 0 var(--accent);
  }

  .grip {
    padding: 0 2px;
    color: var(--text-muted);
    cursor: grab;
    user-select: none;
  }

  .title {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px 8px;
    align-items: baseline;
    min-width: 0;
    padding: 2px 0;
    font: inherit;
    font-size: 13px;
    color: var(--text);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .arrow,
  .place {
    color: var(--text-muted);
  }

  code {
    font-size: 11px;
    color: var(--text-muted);
  }

  small {
    flex-basis: 100%;
    padding-left: 1.2em;
    font-size: 12px;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }
</style>
