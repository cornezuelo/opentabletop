<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { displayName, KIND_ORDER } from '../lib/names'
  import { go, nav } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { manifestOf } from '../lib/packs/workspace'
  import KindBadge from './KindBadge.svelte'
  import { favorites } from '@open-tabletop/oracle-ui'
  import { dialogs } from '../lib/dialogs.svelte'

  let query = $state('')
  let collapsed = $state<Record<string, boolean>>({})

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return workspace.packs.map((pack) => {
      const manifest = manifestOf(pack)
      const defs = (manifest.id ? workspace.engine.list({ pack: manifest.id }) : [])
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
      return { pack, manifest, defs, errors }
    })
  })

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
  <div class="tree">
    {#if pinned.length}
      <div class="pack">
        <div class="pack-row"><span class="pack-name static">★ {t('nav.favorites')}</span></div>
        <ul>
          {#each pinned as { def, name } (def.id)}
            <li>
              <button
                class:selected={selectedDef === def.id}
                onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}
              >
                <KindBadge kind={def.kind} />
                <span class="name">{name}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#each groups as { pack, manifest, defs, errors } (pack.root)}
      {#if !query || defs.length}
        <div class="pack">
          <div class="pack-row" class:selected={selectedPack === pack.root}>
            <button
              class="caret"
              aria-label={manifest.name ?? pack.root}
              aria-expanded={!collapsed[pack.root]}
              onclick={() => (collapsed[pack.root] = !collapsed[pack.root])}
              >{collapsed[pack.root] && !query ? '▸' : '▾'}</button
            >
            <button class="pack-name" onclick={() => go({ name: 'pack', root: pack.root })}>
              {manifest.name ?? pack.root}
            </button>
            {#if pack.personal}
              <span class="tag personal" use:tooltip={t('originTips.personal')}
                >{t('origin.personal')}</span
              >
            {/if}
            {#if pack.overrides}
              <span class="tag" use:tooltip={t('originTips.edited')}>{t('origin.edited')}</span>
              {#if workspace.bundledChanges(pack.root).length}
                <span class="tag updated" use:tooltip={t('originTips.updated')}
                  >{t('origin.updated')}</span
                >
              {/if}
            {:else if pack.origin === 'bundled'}
              <span class="tag" use:tooltip={t('originTips.bundled')}>{t('origin.bundled')}</span>
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
              <span class="errors" use:tooltip={t('nav.problems', { count: errors })}>{errors}</span
              >
            {/if}
          </div>
          {#if !collapsed[pack.root] || query}
            <ul>
              {#each defs as { def, name } (def.id)}
                <li>
                  <button
                    class:selected={selectedDef === def.id}
                    onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}
                  >
                    <KindBadge kind={def.kind} />
                    <span class="name">{name}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    {/each}
    {#if query && groups.every((g) => !g.defs.length)}
      <p class="help">{t('nav.noResults')}</p>
    {/if}
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
    overflow: auto;
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

  .tag {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .tag.personal {
    color: #d8c58a;
  }

  .tag.updated {
    color: var(--accent);
    border-color: var(--accent);
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

  .add + .errors {
    margin-left: 0;
  }

  .errors {
    flex: none;
    min-width: 16px;
    margin-left: auto;
    padding: 0 4px;
    font-size: 11px;
    color: white;
    text-align: center;
    background: var(--danger);
    border-radius: 8px;
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
