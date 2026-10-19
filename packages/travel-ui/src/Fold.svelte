<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import type { Snippet } from 'svelte'
  import { folds } from './folds.svelte'
  import { translator } from './i18n'

  /**
   * A section of the trip panel that folds and unfolds by its heading, remembered per
   * viewer. Its help, if any, sits beside the heading (**What it is**), so reading it
   * doesn't fold the section; `head` adds controls to the heading's line.
   */
  let {
    id,
    title,
    locale,
    help,
    start = true,
    head,
    children,
  }: {
    id: string
    title: string
    locale: string
    /** Its explanation, in basic Markdown. */
    help?: string
    /** Open until the viewer folds it (the default) or folded until opened. */
    start?: boolean
    head?: Snippet
    children: Snippet
  } = $props()

  const t = translator(() => locale)
  const open = $derived(folds.isOpen(id, start))
</script>

<section class="fold">
  <div class="fold-head">
    <button class="fold-toggle" aria-expanded={open} onclick={() => folds.toggle(id, start)}
      ><span class="chevron" class:open aria-hidden="true">▸</span>{title}</button
    >
    {#if help}<span class="fold-help">{t('fold.whatItIs')}<InfoTip markdown={help} /></span>{/if}
    {@render head?.()}
  </div>
  {#if open}{@render children()}{/if}
</section>

<style>
  .fold {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .fold-head {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: center;
  }

  .fold-toggle {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    background: none;
    border: none;
    cursor: pointer;
  }

  .chevron {
    display: inline-block;
    font-size: 10px;
    color: var(--text-muted);
    transition: transform 0.1s;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .fold-help {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
