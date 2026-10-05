<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    open = true,
    children,
  }: { title: string; open?: boolean; children: Snippet } = $props()
</script>

<details {open}>
  <summary>{title}</summary>
  <div class="body">{@render children()}</div>
</details>

<style>
  details {
    border-bottom: 1px solid var(--panel-border);
  }

  summary {
    padding: 10px 0;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    user-select: none;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
  }
</style>
