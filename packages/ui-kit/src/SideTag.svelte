<script lang="ts">
  import type { Snippet } from 'svelte'
  import { tooltip } from './tooltip'

  /** A small pill after a name: where it comes from (`personal`) or that it has news (`updated`). */
  let { kind, tip, children }: { kind?: 'personal' | 'updated'; tip?: string; children: Snippet } =
    $props()
</script>

<span class="tag {kind ?? ''}" use:tooltip={tip}>{@render children()}</span>

<style>
  .tag {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .personal {
    color: #d8c58a;
  }

  .updated {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
