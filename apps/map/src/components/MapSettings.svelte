<script lang="ts">
  import { SetMetaCommand } from '../lib/commands/settings'
  import { t } from '../lib/i18n/index.svelte'
  import { DEFAULT_HEX_KM, type GridSettings } from '@open-tabletop/map'
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

  /** A sub-map's way in: the parent's place, this map's entrance and the kind of the way. */
  const parent = $derived(editor.meta.parent)
  const parentName = $derived(
    editor.linked.parent?.meta.name || editor.linked.ancestors.at(-1)?.name || parent?.map || '',
  )
  const parentPlace = $derived.by(() => {
    const other = editor.linked.parent
    if (!parent) return ''
    return other
      ? formatCoord(parseKey(parent.place), other.grid.coordFormat, other.grid)
      : parent.place
  })
  const coord = (key: string) =>
    formatCoord(parseKey(key as `${number},${number}`), editor.grid.coordFormat, editor.grid)
  const setParent = (patch: Partial<NonNullable<typeof parent>>) =>
    parent && editor.execute(new SetMetaCommand({ parent: { ...parent, ...patch } }))

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
      · {parentPlace}
    </p>
    <p>
      {t('submap.entrance')}: <strong>{coord(parent.entrance)}</strong>
      {#if editor.selected && editor.selected !== parent.entrance}
        <button class="link" onclick={() => setParent({ entrance: editor.selected! })}
          >{t('submap.entranceHere', { hex: coord(editor.selected) })}</button
        >
      {/if}
    </p>
  </div>
  <div class="field">
    <span>{t('submap.kind')}<InfoTip text={t('submap.kindHelp')} /></span>
    <SuggestInput
      value={parent.kind ?? ''}
      list={Object.keys(mapSystem().rules.connections ?? {})}
      label={t('submap.kind')}
      placeholder="way-in"
      onchange={(kind) => setParent({ kind: kind.trim() || undefined })}
    />
  </div>
{/if}

<label class="field">
  <span>{t('map.hexKm')}<InfoTip text={t('map.hexKmHelp')} /></span>
  <input
    type="number"
    min="0.1"
    step="any"
    value={editor.scale.hexKm ?? ''}
    placeholder={t('map.hexKmOf', { km: mapSystem().rules.travel.hexKm ?? DEFAULT_HEX_KM })}
    onchange={(e) => {
      const text = e.currentTarget.value.trim()
      const value = Number(text)
      // Empty: the system's scale.
      if (!text) applySettings({ scale: { hexKm: undefined } })
      else if (Number.isFinite(value) && value > 0) applySettings({ scale: { hexKm: value } })
      else e.currentTarget.value = String(editor.scale.hexKm ?? '')
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

{#if editor.grid.kind === 'square'}
  <label class="check">
    <input
      type="checkbox"
      checked={!!editor.grid.diagonals}
      onchange={(e) => applySettings({ grid: { diagonals: e.currentTarget.checked || undefined } })}
    />
    <span>{t('map.diagonals')}<InfoTip text={t('map.diagonalsHelp')} /></span>
  </label>
{:else}
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
  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .inside p {
    margin: 0;
    color: var(--text);
    font-size: 13px;
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
