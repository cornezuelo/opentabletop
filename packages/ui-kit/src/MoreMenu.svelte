<script lang="ts">
  import type { Snippet } from 'svelte'
  import { tooltip } from './tooltip'

  /**
   * A **⋯** button with the actions that shouldn't sit in sight (deleting, moving): its
   * `children` are buttons, shown in a list below it; a click on one, outside it or Escape
   * closes it.
   */
  let { label, children }: { label: string; children: Snippet } = $props()

  let open = $state(false)
  let root: HTMLDivElement

  function outside(e: PointerEvent) {
    if (open && !root.contains(e.target as Node)) open = false
  }
</script>

<svelte:window
  onpointerdown={outside}
  onkeydown={(e) => {
    if (open && e.key === 'Escape') open = false
  }}
/>

<div class="more" bind:this={root}>
  <button
    type="button"
    class="toggle"
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded={open}
    use:tooltip={label}
    onclick={() => (open = !open)}>⋯</button
  >
  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="list" role="menu" tabindex="-1" onclick={() => (open = false)}>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .more {
    position: relative;
  }

  .toggle {
    width: 32px;
    height: 30px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .toggle:hover,
  .toggle[aria-expanded='true'] {
    color: var(--text);
    border-color: var(--accent);
  }

  .list {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 180px;
    padding: 4px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.35);
  }

  .list :global(button) {
    padding: 6px 10px;
    font-size: 13px;
    text-align: left;
    color: var(--text);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .list :global(button:hover) {
    background: rgb(200 162 74 / 0.1);
  }

  .list :global(button.danger) {
    color: var(--danger, #d9534f);
  }
</style>
