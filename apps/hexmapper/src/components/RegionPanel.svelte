<script lang="ts">
  import { RemoveRegionCommand, SetRegionsCommand, regionSizes } from '../lib/commands/regions'
  import { t } from '../lib/i18n/index.svelte'
  import { newId } from '../lib/model/id'
  import type { MapRegion } from '../lib/model/types'
  import { editor, MAX_BRUSH_RADIUS } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'
  import NoteRefInput from './NoteRefInput.svelte'
  import NameDisplay from './NameDisplay.svelte'

  const COLORS = ['#8b1e1e', '#2f5d8a', '#3d6b35', '#5b3a6e', '#b5734a', '#1b1a17', '#c8a24a']

  const sizes = $derived.by(() => {
    void editor.revision
    return regionSizes(editor.map)
  })
  const active = $derived(editor.regions.find((r) => r.id === editor.regionId))

  function add() {
    const region: MapRegion = {
      id: newId(),
      name: t('regions.newName', { n: editor.regions.length + 1 }),
      color: COLORS[editor.regions.length % COLORS.length],
    }
    editor.execute(new SetRegionsCommand([...editor.map.regions, region]))
    editor.regionId = region.id
  }

  function update(change: (region: MapRegion) => MapRegion) {
    if (!active) return
    editor.execute(
      new SetRegionsCommand(
        editor.map.regions.map((r) => (r.id === active.id ? change({ ...r }) : r)),
      ),
    )
  }

  /** Regions before a slider drag: the drag previews live and is recorded once on release. */
  let before: MapRegion[] | null = null

  function restyle(nameStyle: MapRegion['nameStyle'], live: boolean) {
    if (!active) return
    const id = active.id
    before ??= structuredClone(editor.map.regions)
    editor.map.regions = editor.map.regions.map((r) => (r.id === id ? { ...r, nameStyle } : r))
    editor.notify({ kind: 'regions' })
    if (live) return
    const after = editor.map.regions
    editor.map.regions = before
    before = null
    editor.execute(new SetRegionsCommand(after))
  }

  function remove() {
    if (!active) return
    const count = sizes.get(active.id) ?? 0
    if (count > 0 && !confirm(t('regions.confirmDelete', { name: active.name, count }))) return
    editor.execute(new RemoveRegionCommand(structuredClone(active)))
  }
</script>

<p class="help">{t('regions.help')}</p>

<label class="slider">
  <span>{t('panel.brushSize')}: {editor.brushRadius + 1}</span>
  <input type="range" min="0" max={MAX_BRUSH_RADIUS} bind:value={editor.brushRadius} />
</label>

<ul role="radiogroup" aria-label={t('panel.regions')}>
  {#each editor.regions as region (region.id)}
    <li>
      <button
        role="radio"
        aria-checked={region.id === editor.regionId}
        class:active={region.id === editor.regionId}
        onclick={() => (editor.regionId = region.id)}
      >
        <span class="swatch" style:background={region.color}></span>
        <span class="name">{region.name || '—'}</span>
        <span class="count">{t('regions.hexes', { count: sizes.get(region.id) ?? 0 })}</span>
      </button>
    </li>
  {:else}
    <li class="help">{t('regions.empty')}</li>
  {/each}
</ul>
<button class="add" onclick={add}>{t('regions.add')}</button>

{#if active}
  <div class="group">
    <label class="field">
      <span>{t('regions.name')}</span>
      <input
        type="text"
        value={active.name}
        onchange={(e) => {
          const name = e.currentTarget.value.trim()
          update((r) => ({ ...r, name }))
        }}
      />
    </label>
    <ColorPicker
      value={active.color}
      onchange={(color) => color && update((r) => ({ ...r, color }))}
    />
    <NameDisplay
      kind="regionNames"
      show={active.showName !== false}
      style={active.nameStyle}
      onshow={(show) => update((r) => ({ ...r, showName: show ? undefined : false }))}
      onstyle={(nameStyle, live) => restyle(nameStyle, live)}
    />
    <label class="field">
      <span>{t('regions.note')}</span>
      <NoteRefInput
        value={active.note ?? ''}
        placeholder={t('regions.notePlaceholder')}
        label={t('regions.note')}
        onchange={(note) => update((r) => ({ ...r, note: note.trim() || undefined }))}
      />
    </label>
    <button class="danger" onclick={remove}>{t('regions.delete')}</button>
  </div>
{/if}

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li button {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 4px 6px;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  li button.active {
    border-color: var(--accent);
    background: rgb(200 162 74 / 0.08);
  }

  .swatch {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    font-size: 11px;
    color: var(--text-muted);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .add,
  .danger {
    align-self: flex-start;
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .slider {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
