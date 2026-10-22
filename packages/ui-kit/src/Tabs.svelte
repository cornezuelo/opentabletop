<script lang="ts" generics="Id extends string">
  /**
   * A row of tabs that never wraps: when its tabs don't fit the room it has (a side panel,
   * a narrow window), it becomes a choice of the same tabs. The host draws the tab's panel
   * with `id="<prefix>-panel"` and `aria-labelledby="<prefix>-tab-<chosen>"`.
   */
  let {
    tabs,
    value,
    label,
    prefix,
    onchange,
  }: {
    tabs: { id: Id; label: string }[]
    value: Id
    /** What the tabs are, for screen readers (and the choice's name when narrow). */
    label: string
    /** Prefix of the tabs' and panel's ids, unique in the page. */
    prefix: string
    onchange: (id: Id) => void
  } = $props()

  /** The room the row has, and what its tabs need side by side. */
  let room = $state(0)
  let needed = $state(0)
  // Not measured yet (rendered on a server, hidden): the tabs, as they usually fit.
  const narrow = $derived(room > 0 && needed > room)
</script>

<div class="tabs" bind:clientWidth={room}>
  <!-- The tabs side by side, out of sight, only to know whether they fit. -->
  <div class="measure" aria-hidden="true" bind:clientWidth={needed}>
    {#each tabs as tab (tab.id)}<span class="tab">{tab.label}</span>{/each}
  </div>
  {#if narrow}
    <select
      id="{prefix}-tab-{value}"
      aria-label={label}
      aria-controls="{prefix}-panel"
      {value}
      onchange={(e) => onchange(e.currentTarget.value as Id)}
    >
      {#each tabs as tab (tab.id)}<option value={tab.id}>{tab.label}</option>{/each}
    </select>
  {:else}
    <div class="row" role="tablist" aria-label={label}>
      {#each tabs as tab (tab.id)}
        <button
          role="tab"
          class="tab"
          id="{prefix}-tab-{tab.id}"
          aria-selected={value === tab.id}
          aria-controls="{prefix}-panel"
          class:on={value === tab.id}
          onclick={() => onchange(tab.id)}>{tab.label}</button
        >
      {/each}
    </div>
  {/if}
</div>

<style>
  .tabs {
    position: relative;
    display: flex;
    align-items: end;
    min-width: 0;
    border-bottom: 1px solid var(--panel-border);
  }

  .row {
    display: flex;
    flex-wrap: nowrap;
    gap: 2px;
    min-width: 0;
  }

  .measure {
    position: absolute;
    display: inline-flex;
    gap: 2px;
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
  }

  .tab {
    flex: none;
    margin-bottom: -1px;
    padding: 5px 10px;
    font-size: 12px;
    white-space: nowrap;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
  }

  .tab.on {
    color: var(--accent);
    background: var(--bg);
    border-color: var(--panel-border);
    border-bottom-color: var(--bg);
  }

  select {
    flex: 1;
    min-width: 0;
    margin-bottom: 4px;
    font-size: 12px;
  }
</style>
