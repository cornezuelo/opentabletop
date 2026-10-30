<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fullText } from './tooltip'

  /**
   * One thing of a list on one line (a map, a trip, a character): its name (cut short when
   * long, a link with `href`, faint and slanted when `untitled`), what it is beside it
   * (`meta`), and whatever the page puts after (`children`: a badge, links, buttons).
   * `highlight` marks the one that matters (going on, the open one); `plain` is a line
   * without the card around it, for a short list inside another box.
   */
  let {
    name,
    href,
    untitled = false,
    meta,
    highlight = false,
    plain = false,
    children,
  }: {
    name: string
    href?: string
    untitled?: boolean
    meta?: string
    highlight?: boolean
    plain?: boolean
    children?: Snippet
  } = $props()
</script>

<li class="row-card" class:highlight class:plain>
  {#if href}
    <a class="name" class:untitled {href} use:fullText>{name}</a>
  {:else}
    <span class="name" class:untitled use:fullText>{name}</span>
  {/if}
  {#if meta}<span class="meta">{meta}</span>{/if}
  {@render children?.()}
</li>

<style>
  .row-card {
    display: flex;
    gap: 12px;
    align-items: baseline;
    min-width: 0;
    padding: 8px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .row-card.highlight {
    border-color: var(--accent);
  }

  .row-card.plain {
    padding: 3px 0;
    font-size: 13px;
    background: none;
    border: none;
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .untitled {
    font-style: italic;
    color: var(--text-muted);
  }

  .meta {
    font-size: 12px;
    color: var(--text-muted);
  }

  .row-card :global(a:not(.name)) {
    font-size: 13px;
    color: var(--accent);
  }
</style>
