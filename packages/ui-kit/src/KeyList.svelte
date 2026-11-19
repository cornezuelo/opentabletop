<script lang="ts">
  import Kbd from './Kbd.svelte'
  import type { Shortcut } from './shortcuts'

  /**
   * Shortcuts as rows, the keys on the left and what they do beside them: the shortcuts
   * dialog's groups, and the keys of a tool under its panel (with `title`, an overline).
   */
  let { shortcuts, locale, title }: { shortcuts: Shortcut[]; locale: string; title?: string } =
    $props()
</script>

<div class="key-list">
  {#if title}<p class="overline">{title}</p>{/if}
  <dl>
    {#each shortcuts as shortcut (shortcut.keys.join() + shortcut.does)}
      <dt><Kbd keys={shortcut.keys} {locale} stacked /></dt>
      <dd>{shortcut.does}</dd>
    {/each}
  </dl>
</div>

<style>
  .overline {
    margin: 0 0 6px;
  }

  dl {
    display: grid;
    /* The keys take what they need, up to half: a long combination wraps, its text stays readable. */
    grid-template-columns: fit-content(50%) 1fr;
    gap: 6px 12px;
    align-items: baseline;
    margin: 0;
  }

  dt {
    margin: 0;
  }

  dd {
    margin: 0;
    font-size: 13px;
  }
</style>
