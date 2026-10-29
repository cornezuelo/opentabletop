<script lang="ts">
  import type { Snippet } from 'svelte'

  /**
   * A row of a sidebar's buttons; the main one has `class="primary"`. A link (one that opens
   * another app) looks like the buttons.
   */
  let { children }: { children: Snippet } = $props()
</script>

<div class="buttons">{@render children()}</div>

<style>
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .buttons :global(button),
  .buttons :global(a) {
    flex: 1 1 auto;
    white-space: nowrap;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons :global(a) {
    color: inherit;
    text-align: center;
    text-decoration: none;
  }

  .buttons :global(button.primary),
  .buttons :global(a.primary) {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
