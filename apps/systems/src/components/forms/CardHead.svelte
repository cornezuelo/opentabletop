<script lang="ts">
  import type { Snippet } from 'svelte'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'

  /**
   * A foldable card's head: its name, its id and a line saying what it does; a click folds
   * or unfolds it. Buttons of its own (remove) go beside it.
   */
  let {
    title,
    id,
    said,
    open,
    ontoggle,
    children,
  }: {
    title: string
    id: string
    said?: string
    open: boolean
    ontoggle: () => void
    children?: Snippet
  } = $props()
</script>

<div class="head">
  <button
    class="title"
    aria-expanded={open}
    use:tooltip={open ? t('forms.fold') : t('forms.unfold')}
    onclick={ontoggle}
  >
    <span class="arrow">{open ? '▾' : '▸'}</span>
    <strong>{title}</strong>
    {#if id !== title}<code>{id}</code>{/if}
    {#if said}<small>{said}</small>{/if}
  </button>
  {@render children?.()}
</div>

<style>
  .head {
    display: flex;
    gap: 4px;
    align-items: center;
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

  .arrow {
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
