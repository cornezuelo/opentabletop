<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fullText } from './tooltip'

  /**
   * A row of a sidebar's tree: a caret that folds what's under it, a name that does what the
   * host says (`onclick`), or folds too when it says nothing, and what comes after it
   * (`tags`). What's under it (`children`) shows while it's open.
   */
  let {
    name,
    open,
    selected = false,
    onclick,
    ontoggle,
    tags,
    children,
  }: {
    name: string
    open: boolean
    selected?: boolean
    onclick?: () => void
    ontoggle: () => void
    tags?: Snippet
    children?: Snippet
  } = $props()
</script>

<li>
  <div class="row" class:selected>
    <button class="caret" aria-label={name} aria-expanded={open} onclick={ontoggle}
      >{open ? '▾' : '▸'}</button
    >
    <button class="name" onclick={onclick ?? ontoggle}><span use:fullText>{name}</span></button>
    {@render tags?.()}
  </div>
  {#if open}<ul>{@render children?.()}</ul>{/if}
</li>

<style>
  li {
    list-style: none;
  }

  ul {
    margin: 0;
    padding: 0 0 0 14px;
  }

  .row {
    display: flex;
    gap: 4px;
    align-items: center;
    border-radius: 4px;
  }

  .row:hover {
    background: var(--panel-hover);
  }

  .row.selected {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  button {
    padding: 4px 2px;
    color: var(--text);
    background: none;
    border: none;
    cursor: pointer;
  }

  .caret {
    flex: none;
    width: 16px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
