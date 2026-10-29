<script lang="ts">
  import { tooltip } from './tooltip'

  /**
   * A list's filter by tags: the tags its entries have, as pills; choosing some keeps only
   * the entries that have every one chosen (`hasTags`). Nothing is shown when no entry has a tag.
   */
  let {
    tags,
    chosen,
    label,
    clear,
    onchange,
  }: {
    /** Every tag the list's entries have. */
    tags: readonly string[]
    chosen: readonly string[]
    /** What the pills are, for screen readers. */
    label: string
    /** The name of the button that clears the choice. */
    clear: string
    onchange: (chosen: string[]) => void
  } = $props()

  const shown = $derived([...new Set([...chosen, ...tags])].sort((a, b) => a.localeCompare(b)))
  const toggle = (tag: string) =>
    onchange(chosen.includes(tag) ? chosen.filter((t) => t !== tag) : [...chosen, tag])
</script>

{#if shown.length}
  <div class="tag-filter" role="group" aria-label={label}>
    {#each shown as tag (tag)}
      <button
        class="pill"
        class:on={chosen.includes(tag)}
        aria-pressed={chosen.includes(tag)}
        onclick={() => toggle(tag)}>{tag}</button
      >
    {/each}
    {#if chosen.length}
      <button class="clear" use:tooltip={clear} aria-label={clear} onclick={() => onchange([])}
        >×</button
      >
    {/if}
  </div>
{/if}

<style>
  .tag-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pill,
  .clear {
    padding: 0 7px;
    font-size: 11px;
    line-height: 18px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 9px;
    cursor: pointer;
  }

  .pill.on {
    color: var(--accent);
    border-color: var(--accent);
    background: rgb(200 162 74 / 0.12);
  }

  .clear {
    border-color: transparent;
  }
</style>
