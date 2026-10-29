<script lang="ts">
  import { fullText, SideCount, SideTag, tooltip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { OlderPacks } from '@open-tabletop/pack-ui'
  import { displayName, KIND_ORDER } from '../lib/names'
  import { go, nav } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { manifestOf } from '../lib/packs/workspace'
  import KindBadge from './KindBadge.svelte'
  import { definitionFilter, DefinitionFilters, favorites } from '@open-tabletop/oracle-ui'
  import { oracleUi } from '../lib/oracle.svelte'
  import { dialogs } from '../lib/dialogs.svelte'
  import { isHidden } from '../lib/hiddenPacks.svelte'

  let query = $state('')
  let collapsed = $state<Record<string, boolean>>({})

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return workspace.packs.map((pack) => {
      const manifest = manifestOf(pack)
      const all = manifest.id ? workspace.engine.list({ pack: manifest.id }) : []
      const defs = all
        .filter((def) => definitionFilter.passes(def))
        .map((def) => ({ def, name: displayName(def) }))
        .filter(
          ({ def, name }) =>
            !q ||
            name.toLowerCase().includes(q) ||
            def.localId.includes(q) ||
            def.tags.some((tag) => tag.toLowerCase().includes(q)),
        )
        .sort(
          (a, b) =>
            KIND_ORDER.indexOf(a.def.kind) - KIND_ORDER.indexOf(b.def.kind) ||
            a.name.localeCompare(b.name),
        )
      const errors = workspace.diagnostics(pack.root).filter((d) => d.severity === 'error').length
      return { pack, manifest, all, defs, errors }
    })
  })
  /** Packs hidden in Preferences stay out of the tree, not out of the favorites. */
  const shownGroups = $derived(groups.filter((g) => !isHidden(g.manifest.id)))

  /** What the filter's chips offer: the definitions of the packs shown, before filtering. */
  const everything = $derived(shownGroups.flatMap((g) => g.all))

  /** Favorites pinned on top (filtered by the search too). */
  const pinned = $derived(
    groups
      .flatMap((g) => g.defs)
      .filter(({ def }) => favorites.has(def.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  const selectedDef = $derived(nav.view.name === 'def' ? nav.view.id : undefined)
  const selectedPack = $derived(nav.view.name === 'pack' ? nav.view.root : undefined)
</script>

<nav class="sidebar">
  <input type="search" placeholder={t('nav.search')} bind:value={query} />
  <DefinitionFilters ui={oracleUi} defs={everything} />
  <div class="tree">
    {#if pinned.length}
      <div class="pack">
        <div class="pack-row">
          <span class="pack-name static" use:fullText>★ {t('nav.favorites')}</span>
        </div>
        <ul>
          {#each pinned as { def, name } (def.id)}
            <li>
              <button
                class:selected={selectedDef === def.id}
                onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}
              >
                <KindBadge kind={def.kind} />
                <span class="name" use:fullText>{name}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#each shownGroups as { pack, manifest, defs, errors } (pack.root)}
      {#if (!query && !definitionFilter.count) || defs.length}
        <div class="pack">
          <div class="pack-row" class:selected={selectedPack === pack.root}>
            <button
              class="caret"
              aria-label={manifest.name ?? pack.root}
              aria-expanded={!collapsed[pack.root]}
              onclick={() => (collapsed[pack.root] = !collapsed[pack.root])}
              >{collapsed[pack.root] && !query && !definitionFilter.count ? '▸' : '▾'}</button
            >
            <button
              class="pack-name"
              use:fullText
              onclick={() => go({ name: 'pack', root: pack.root })}
            >
              {manifest.name ?? pack.root}
            </button>
            {#if pack.personal}
              <SideTag kind="personal" tip={t('originTips.personal')}
                >{t('origin.personal')}</SideTag
              >
            {/if}
            {#if pack.overrides}
              <SideTag tip={t('originTips.edited')}>{t('origin.edited')}</SideTag>
              {#if workspace.bundledChanges(pack.root).length}
                <SideTag kind="updated" tip={t('originTips.updated')}>{t('origin.updated')}</SideTag
                >
              {/if}
            {:else if pack.origin === 'bundled'}
              <SideTag tip={t('originTips.bundled')}>{t('origin.bundled')}</SideTag>
            {/if}
            {#if pack.origin === 'user'}
              <button
                class="add"
                aria-label={t('nav.newDefinition')}
                use:tooltip={t('nav.newDefinition')}
                onclick={() => (dialogs.newDefinition = { root: pack.root })}>+</button
              >
            {/if}
            {#if errors}
              <span class="push"
                ><SideCount count={errors} tip={t('nav.problems', { count: errors })} /></span
              >
            {/if}
          </div>
          {#if !collapsed[pack.root] || query || definitionFilter.count}
            <ul>
              {#each defs as { def, name } (def.id)}
                <li>
                  <button
                    class:selected={selectedDef === def.id}
                    onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}
                  >
                    <KindBadge kind={def.kind} />
                    <span class="name" use:fullText>{name}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    {/each}
    {#if (query || definitionFilter.count) && shownGroups.every((g) => !g.defs.length)}
      <p class="help">{t('nav.noResults')}</p>
    {/if}
    <OlderPacks library={workspace} locale={getLocale()} />
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    padding: 10px;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  .tree {
    flex: 1;
    padding-right: var(--scroll-room);
    overflow: auto;
    scrollbar-gutter: stable;
  }

  .pack {
    margin-bottom: 8px;
  }

  .pack-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 2px 0;
    border-radius: 4px;
  }

  .pack-row.selected {
    background: rgb(200 162 74 / 0.12);
  }

  .caret {
    width: 18px;
    padding: 0;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .pack-name.static {
    cursor: default;
  }

  .pack-name {
    overflow: hidden;
    padding: 0;
    font-weight: 600;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: none;
    border: none;
    cursor: pointer;
  }

  .add {
    flex: none;
    width: 20px;
    height: 20px;
    padding: 0;
    margin-left: auto;
    line-height: 1;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .add:hover {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  .push {
    display: flex;
    margin-left: auto;
  }

  .add + .push {
    margin-left: 0;
  }

  ul {
    margin: 2px 0 0;
    padding: 0 0 0 14px;
    list-style: none;
  }

  li button {
    display: flex;
    gap: 6px;
    align-items: center;
    width: 100%;
    padding: 3px 6px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  li button:hover {
    background: rgb(255 255 255 / 0.04);
  }

  li button.selected {
    background: rgb(200 162 74 / 0.18);
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .help {
    color: var(--text-muted);
  }
</style>
