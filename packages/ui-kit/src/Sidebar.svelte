<script lang="ts">
  import type { Snippet } from 'svelte'

  /** An app's left column: its title, then what it lists (`SideItem`s, `SideButtons`, links…). */
  let { title, children }: { title?: string; children: Snippet } = $props()
</script>

<nav class="sidebar">
  {#if title}<h2>{title}</h2>{/if}
  {@render children()}
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 10px calc(10px + var(--scroll-room)) 10px 10px;
    overflow: auto;
    scrollbar-gutter: stable;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  h2 {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  /* The links and notes a sidebar ends with. */
  .sidebar :global(.side-link) {
    padding: 0;
    font-size: 13px;
    color: var(--accent);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .sidebar :global(.side-help) {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .sidebar :global(.side-search) {
    width: 100%;
    box-sizing: border-box;
  }
</style>
