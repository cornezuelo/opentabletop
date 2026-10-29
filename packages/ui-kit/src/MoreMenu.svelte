<script lang="ts">
  import type { Snippet } from 'svelte'
  import { tooltip } from './tooltip'

  /**
   * A **⋯** button with the actions that shouldn't sit in sight (deleting, moving): its
   * `children` are buttons, shown in a list below it; a click on one, outside it or Escape
   * closes it. With `button`, the toggle shows that instead of **⋯** (and its list opens
   * under its left edge with `align: 'left'`).
   */
  let {
    label,
    button,
    align = 'right',
    children,
  }: {
    label: string
    button?: Snippet
    align?: 'left' | 'right'
    children: Snippet
  } = $props()

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
    class:wide={!!button}
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded={open}
    use:tooltip={label}
    onclick={() => (open = !open)}
    >{#if button}{@render button()}{:else}⋯{/if}</button
  >
  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="list"
      class:left={align === 'left'}
      role="menu"
      tabindex="-1"
      onclick={() => (open = false)}
    >
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

  .toggle.wide {
    width: auto;
    max-width: 260px;
    padding: 0 10px;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .list.left {
    right: auto;
    left: 0;
  }

  .list :global(button),
  .list :global(a) {
    padding: 6px 10px;
    font-size: 13px;
    text-align: left;
    color: var(--text);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .list :global(a) {
    text-decoration: none;
  }

  .list :global(button:hover),
  .list :global(a:hover) {
    background: rgb(200 162 74 / 0.1);
  }

  .list :global(button.danger) {
    color: var(--danger, #d9534f);
  }
</style>
