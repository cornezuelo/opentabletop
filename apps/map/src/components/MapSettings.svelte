<script lang="ts">
  import { SetMetaCommand } from '../lib/commands/settings'
  import { t } from '../lib/i18n/index.svelte'
  import { DEFAULT_CELL_KM, type GridSettings, type HexKey, type MapWay } from '@open-tabletop/map'
  import { mapSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import { applySettings } from '../lib/store/settings'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { openLibraryMap } from '../lib/io/actions.svelte'

  async function copyId() {
    try {
      await navigator.clipboard.writeText(editor.meta.id)
      showToast(t('map.idCopied'))
    } catch {
      // Clipboard blocked (e.g. insecure context): the id is still selectable.
    }
  }

  /** A sub-map's ways: each the parent's place, this map's entrance and the kind of the way. */
  const parent = $derived(editor.meta.parent)
  const parentName = $derived(
    editor.linked.parent?.meta.name || editor.linked.ancestors.at(-1)?.name || parent?.map || '',
  )
  /** A place of the parent, by its name and coordinates. */
  const parentPlace = (key: HexKey) => {
    const other = editor.linked.parent
    if (!other) return key
    const at = formatCoord(parseKey(key), other.grid.coordFormat, other.grid)
    const name = other.hexes[key]?.name
    return name ? `${name} (${at})` : at
  }
  const coord = (key: string) =>
    formatCoord(parseKey(key as `${number},${number}`), editor.grid.coordFormat, editor.grid)
  /** Changes one way (`patch`), or removes it (`null`). */
  const setWay = (index: number, patch: Partial<MapWay> | null) => {
    if (!parent) return
    const ways = parent.ways.flatMap((w, i) =>
      i !== index ? [w] : patch ? [{ ...w, ...patch }] : [],
    )
    editor.execute(new SetMetaCommand({ parent: { ...parent, ways } }))
  }

  function setName(input: HTMLInputElement) {
    const name = input.value.trim()
    if (name !== editor.meta.name) editor.execute(new SetMetaCommand({ name }))
  }
</script>

<label class="field">
  <span>{t('map.name')}</span>
  <input
    type="text"
    value={editor.meta.name}
    placeholder={t('map.untitled')}
    onchange={(e) => setName(e.currentTarget)}
  />
</label>

<div class="field">
  <span>{t('map.id')}</span>
  <div class="id">
    <code>{editor.meta.id}</code>
    <button class="icon" use:tooltip={t('map.copyId')} aria-label={t('map.copyId')} onclick={copyId}
      >⧉</button
    >
  </div>
</div>

{#if parent}
  <div class="field inside">
    <span>{t('submap.inside')}<InfoTip text={t('submap.insideHelp')} /></span>
    <p>
      <button class="link" onclick={() => openLibraryMap(parent.map)}>{parentName}</button>
    </p>
  </div>
  {#each parent.ways as way, i (i)}
    <div class="field way">
      <span>{t('submap.way', { n: i + 1 })}</span>
      <div class="way-body">
        <p>{t('submap.from')}: <strong>{parentPlace(way.place)}</strong></p>
        <p>
          {t('submap.entrance')}: <strong>{coord(way.entrance)}</strong>
          {#if editor.selected && editor.selected !== way.entrance}
            <button class="link" onclick={() => setWay(i, { entrance: editor.selected! })}
              >{t('submap.entranceHere', { hex: coord(editor.selected) })}</button
            >
          {/if}
        </p>
        <div class="way-kind">
          <span>{t('submap.kind')}<InfoTip text={t('submap.kindHelp')} /></span>
          <SuggestInput
            value={way.kind ?? ''}
            list={Object.keys(mapSystem().rules.connections ?? {})}
            label={t('submap.kind')}
            placeholder="way-in"
            onchange={(kind) => setWay(i, { kind: kind.trim() || undefined })}
          />
        </div>
        {#if parent.ways.length > 1}
          <button class="link" onclick={() => setWay(i, null)}>{t('submap.removeWay')}</button>
        {/if}
      </div>
    </div>
  {/each}
{/if}

<label class="field">
  <span>{t('map.cellKm')}<InfoTip text={t('map.cellKmHelp')} /></span>
  <input
    type="number"
    min="0.1"
    step="any"
    value={editor.scale.cellKm ?? ''}
    placeholder={t('map.cellKmOf', { km: mapSystem().rules.travel.cellKm ?? DEFAULT_CELL_KM })}
    onchange={(e) => {
      const text = e.currentTarget.value.trim()
      const value = Number(text)
      // Empty: the system's scale.
      if (!text) applySettings({ scale: { cellKm: undefined } })
      else if (Number.isFinite(value) && value > 0) applySettings({ scale: { cellKm: value } })
      else e.currentTarget.value = String(editor.scale.cellKm ?? '')
    }}
  />
</label>

<label class="field">
  <span>{t('map.cells')}<InfoTip text={t('map.cellsHelp')} /></span>
  <select
    value={editor.grid.kind ?? 'hex'}
    onchange={(e) =>
      applySettings({
        grid: { kind: e.currentTarget.value === 'square' ? 'square' : undefined },
      })}
  >
    <option value="hex">{t('map.cellsHex')}</option>
    <option value="square">{t('map.cellsSquare')}</option>
  </select>
</label>

{#if editor.grid.kind !== 'square'}
  <label class="field">
    <span>{t('map.orientation')}</span>
    <select
      value={editor.grid.orientation}
      onchange={(e) =>
        applySettings({
          grid: { orientation: e.currentTarget.value as GridSettings['orientation'] },
        })}
    >
      <option value="flat">{t('map.flat')}</option>
      <option value="pointy">{t('map.pointy')}</option>
    </select>
  </label>
{/if}

<label class="field">
  <span>{t('map.coordFormat')}<InfoTip text={t('map.coordFormatHelp')} /></span>
  <select
    value={editor.grid.coordFormat}
    onchange={(e) =>
      applySettings({
        grid: { coordFormat: e.currentTarget.value as GridSettings['coordFormat'] },
      })}
  >
    <option value="CCRR">{t('map.coordCCRR')}</option>
    <option value="axial">{t('map.coordAxial')}</option>
  </select>
</label>

<style>
  .inside p,
  .way p {
    margin: 0;
    color: var(--text);
    font-size: 13px;
  }

  .way-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .way-kind {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }

  .link {
    padding: 0;
    font: inherit;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .id {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  code {
    flex: 1;
    padding: 4px 8px;
    color: var(--text);
    background: var(--bg);
    border-radius: 4px;
    user-select: all;
  }

  .id .icon {
    height: 28px;
  }

  select {
    width: 100%;
  }
</style>
