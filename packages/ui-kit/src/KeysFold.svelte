<script lang="ts">
  import KeyboardIcon from './KeyboardIcon.svelte'
  import KeyList from './KeyList.svelte'
  import type { ShortcutGroup } from './shortcuts'

  /**
   * The keys of what's in use (a tool), at the foot of its panel: a one-line strip that
   * unfolds into their list. Whether it's open is remembered in this browser (`storageKey`).
   */
  let {
    label,
    groups,
    locale,
    storageKey,
  }: {
    /** The strip's name (_Keys of Terrain_). */
    label: string
    groups: ShortcutGroup[]
    locale: string
    storageKey: string
  } = $props()

  function read(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'open'
    } catch {
      return false
    }
  }
  // svelte-ignore state_referenced_locally
  let open = $state(read(storageKey))
  function toggle() {
    open = !open
    try {
      localStorage.setItem(storageKey, open ? 'open' : 'closed')
    } catch {
      // Not remembered; it still applies now.
    }
  }
  const count = $derived(groups.reduce((n, group) => n + group.shortcuts.length, 0))
</script>

<div class="keys-fold">
  <button class="strip" aria-expanded={open} onclick={toggle}>
    <KeyboardIcon />
    <span class="label">{label}</span>
    <span class="count">{count}</span>
    <span class="caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
  </button>
  {#if open}
    <div class="lists">
      {#each groups as group (group.title)}
        <KeyList
          title={groups.length > 1 ? group.title : undefined}
          shortcuts={group.shortcuts}
          {locale}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .keys-fold {
    border-top: 1px solid var(--panel-border);
    background: var(--panel);
  }

  .strip {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 0;
    font: inherit;
    font-size: 13px;
    color: var(--text-muted);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .strip:hover {
    color: var(--accent);
  }

  .label {
    flex: 1;
  }

  .count {
    padding: 0 6px;
    font-size: 11px;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .lists {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 40vh;
    padding-bottom: 10px;
    overflow-y: auto;
  }
</style>
