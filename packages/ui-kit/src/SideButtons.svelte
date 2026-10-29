<script lang="ts">
  import type { Snippet } from 'svelte'

  /** A row of a sidebar's buttons; the main one has `class="primary"`. */
  let { children }: { children: Snippet } = $props()
</script>

<div class="buttons">{@render children()}</div>

<style>
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .buttons :global(button) {
    flex: 1 1 auto;
    white-space: nowrap;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons :global(button.primary) {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
