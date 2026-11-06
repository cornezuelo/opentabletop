<script lang="ts" generics="Id extends string">
  /**
   * Many tabs down the side of a page, in groups (a group's `label` is its title): for pages
   * with more tabs than a row holds. With `narrow` they become a choice of the same tabs, for
   * the host to draw above its panel. The host's panel has `id="<prefix>-panel"`.
   */
  let {
    groups,
    value,
    label,
    prefix,
    narrow = false,
    onchange,
  }: {
    groups: { label?: string; tabs: { id: Id; label: string }[] }[]
    value: Id
    /** What the tabs are, for screen readers (and the choice's name when narrow). */
    label: string
    /** Prefix of the tabs' and panel's ids, unique in the page. */
    prefix: string
    narrow?: boolean
    onchange: (id: Id) => void
  } = $props()
</script>

{#if narrow}
  <select
    class="choice"
    id="{prefix}-tab-{value}"
    aria-label={label}
    aria-controls="{prefix}-panel"
    {value}
    onchange={(e) => onchange(e.currentTarget.value as Id)}
  >
    {#each groups as group, i (i)}
      {#if group.label}
        <optgroup label={group.label}>
          {#each group.tabs as tab (tab.id)}<option value={tab.id}>{tab.label}</option>{/each}
        </optgroup>
      {:else}
        {#each group.tabs as tab (tab.id)}<option value={tab.id}>{tab.label}</option>{/each}
      {/if}
    {/each}
  </select>
{:else}
  <div class="rail" role="tablist" aria-label={label} aria-orientation="vertical">
    {#each groups as group, i (i)}
      {#if group.label}<h3>{group.label}</h3>{:else if i}<hr />{/if}
      {#each group.tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          id="{prefix}-tab-{tab.id}"
          aria-selected={value === tab.id}
          aria-controls="{prefix}-panel"
          class:active={value === tab.id}
          onclick={() => onchange(tab.id)}>{tab.label}</button
        >
      {/each}
    {/each}
  </div>
{/if}

<style>
  /* In sight while a long page scrolls beside it. */
  .rail {
    position: sticky;
    top: 0;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  h3 {
    margin: 12px 0 4px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
  }

  hr {
    width: 100%;
    margin: 8px 0;
    border: none;
    border-top: 1px solid var(--panel-border);
  }

  button {
    padding: 5px 10px;
    color: var(--text-muted);
    text-align: left;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    cursor: pointer;
  }

  button:hover {
    color: var(--text);
  }

  button.active {
    color: var(--text);
    border-left-color: var(--accent);
  }

  .choice {
    width: 100%;
  }
</style>
