<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import type { Snippet } from 'svelte'

  /**
   * A section of a trip panel's tab: a plain heading (its help, if any, on its text) and
   * what's under it; `head` adds controls to the heading's line.
   */
  let {
    title,
    help,
    head,
    children,
  }: {
    title: string
    /** Its explanation, in basic Markdown. */
    help?: string
    head?: Snippet
    children: Snippet
  } = $props()
</script>

<section class="section">
  <div class="section-head">
    <h3>
      {title}{#if help}<InfoTip markdown={help} />{/if}
    </h3>
    {@render head?.()}
  </div>
  {@render children()}
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Each section after the first, set apart by a line. */
  .section + :global(.section) {
    padding-top: 10px;
    border-top: 1px solid var(--panel-border);
  }

  .section-head {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
</style>
