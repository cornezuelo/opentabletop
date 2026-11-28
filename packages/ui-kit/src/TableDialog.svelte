<script lang="ts">
  import type { Snippet } from 'svelte'
  import { portal } from './portal'
  import StyledText from './StyledText.svelte'

  /**
   * The table of dice or cards as a dialog over the page (docs/dice.md, docs/cards.md): a
   * trip's moment waits on it. Its title, the cloth and what's under it (`children`), the
   * buttons (`foot`). The same table lives in the page without it (the Oracle's).
   */
  let {
    title = '',
    label,
    width = 640,
    children,
    foot,
  }: {
    title?: string
    /** Its name for those who can't see it, when it has no title. */
    label?: string
    /** Its widest, in px. */
    width?: number
    children: Snippet
    foot: Snippet
  } = $props()
</script>

<div class="table-dialog" use:portal role="dialog" aria-modal="true" aria-label={title || label}>
  <div class="box" style:width="min({width}px, 100%)">
    {#if title}<p class="title"><StyledText text={title} /></p>{/if}
    {@render children()}
    <div class="foot">{@render foot()}</div>
  </div>
</div>

<style>
  .table-dialog {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.55);
  }

  .box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.5);
  }

  .title {
    margin: 0;
    font-weight: 600;
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }
</style>
