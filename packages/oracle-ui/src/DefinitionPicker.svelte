<script lang="ts">
  import { KIND_ORDER } from './names'
  import { manifestOf } from '@open-tabletop/pack-ui'
  import type { OracleUi } from './ui'

  let {
    ui,
    selected,
    onselect,
  }: { ui: OracleUi; selected?: string; onselect: (id: string) => void } = $props()
  const t = $derived(ui.t)

  let query = $state('')

  /** Every definition of every pack, filtered by name, id or tag. */
  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return ui.library.packs
      .map((pack) => {
        const manifest = manifestOf(pack)
        const defs = (manifest.id ? ui.library.engine.list({ pack: manifest.id }) : [])
          .map((def) => ({ def, name: ui.displayName(def) }))
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
        return { root: pack.root, name: manifest.name ?? pack.root, defs }
      })
      .filter((g) => g.defs.length)
  })
</script>

<div class="picker">
  <input type="search" placeholder={t('picker.search')} bind:value={query} />
  <ul>
    {#each groups as group (group.root)}
      <li class="pack">{group.name}</li>
      {#each group.defs as { def, name } (def.id)}
        <li>
          <button class:selected={selected === def.id} onclick={() => onselect(def.id)}>
            {name}
          </button>
        </li>
      {/each}
    {:else}
      <li class="empty">{t('picker.none')}</li>
    {/each}
  </ul>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  ul {
    max-height: 220px;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .pack {
    position: sticky;
    top: 0;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--panel);
  }

  li button {
    width: 100%;
    padding: 3px 8px 3px 14px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  li button:hover {
    background: rgb(255 255 255 / 0.04);
  }

  li button.selected {
    color: var(--accent);
    background: rgb(200 162 74 / 0.12);
  }

  .empty {
    padding: 6px 8px;
    color: var(--text-muted);
  }
</style>
