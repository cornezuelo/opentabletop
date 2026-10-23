<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { definitionFilter } from './definitionFilter.svelte'
  import { KIND_ORDER } from './names'
  import type { OracleUi } from './ui'

  /**
   * Chips that narrow a list of definitions: by kind, and by the tags the packs give them
   * (a click shows only those with the tag, a second only those without it, a third
   * forgets it). Folded under a button that counts what's chosen.
   */
  let { ui, defs }: { ui: OracleUi; defs: readonly { kind: string; tags: readonly string[] }[] } =
    $props()
  const t = $derived(ui.t)

  let open = $state(false)
  const filter = $derived(definitionFilter.state)

  /** Kinds and tags the list has, and those chosen even if nothing has them now. */
  const kinds = $derived(
    KIND_ORDER.filter((k) => filter.kinds.includes(k) || defs.some((d) => d.kind === k)),
  )
  const tags = $derived(
    [...new Set([...defs.flatMap((d) => d.tags), ...Object.keys(filter.tags)])].sort((a, b) =>
      a.localeCompare(b),
    ),
  )
</script>

<div class="filters">
  <div class="bar">
    <button
      class="toggle"
      class:active={definitionFilter.count > 0}
      aria-expanded={open}
      onclick={() => (open = !open)}
      >{open ? '▾' : '▸'}
      {definitionFilter.count
        ? t('filter.titleCount', { count: definitionFilter.count })
        : t('filter.title')}</button
    >
    {#if definitionFilter.count}
      <button class="clear" onclick={() => definitionFilter.clear()}>{t('filter.clear')}</button>
    {/if}
  </div>
  {#if open}
    <div class="chips" role="group" aria-label={t('filter.kinds')}>
      {#each kinds as kind (kind)}
        <button
          class="chip"
          class:only={filter.kinds.includes(kind)}
          aria-pressed={filter.kinds.includes(kind)}
          onclick={() => definitionFilter.toggleKind(kind)}
          >{t(`filter.kindNames.${kind as 'table'}`)}</button
        >
      {/each}
    </div>
    {#if tags.length}
      <div class="chips" role="group" aria-label={t('filter.tags')}>
        {#each tags as tag (tag)}
          {@const mode = filter.tags[tag]}
          <button
            class="chip tag"
            class:only={mode === 'only'}
            class:not={mode === 'not'}
            use:tooltip={t(
              mode === 'only'
                ? 'filter.tagOnly'
                : mode === 'not'
                  ? 'filter.tagNot'
                  : 'filter.tagOff',
              { tag },
            )}
            onclick={() => definitionFilter.cycleTag(tag)}
            >{mode === 'not' ? `−${tag}` : tag}</button
          >
        {/each}
      </div>
    {:else}
      <p class="none">{t('filter.noTags')}</p>
    {/if}
  {/if}
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bar {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .toggle,
  .clear {
    padding: 0;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .toggle.active {
    color: var(--accent);
  }

  .clear {
    margin-left: auto;
    text-decoration: underline;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chip {
    padding: 1px 7px;
    font-size: 11px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    cursor: pointer;
  }

  .chip.only {
    color: var(--text);
    background: rgb(200 162 74 / 0.18);
    border-color: var(--accent);
  }

  .chip.not {
    color: var(--danger);
    text-decoration: line-through;
    border-color: var(--danger);
  }

  .none {
    margin: 0;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
