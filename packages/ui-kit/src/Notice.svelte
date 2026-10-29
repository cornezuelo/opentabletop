<script lang="ts">
  import type { Snippet } from 'svelte'

  /** A dashed note above a view: what it says, and the button (if any) that acts on it (`class="plain"` for a quiet one). */
  let { children }: { children: Snippet } = $props()
</script>

<div class="notice">{@render children()}</div>

<style>
  .notice {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  .notice :global(button) {
    flex: none;
    padding: 5px 10px;
    color: var(--bg);
    background: var(--accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .notice :global(button.plain) {
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
  }
</style>
