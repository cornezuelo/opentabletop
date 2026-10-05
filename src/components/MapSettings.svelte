<script lang="ts">
  import { SetGridCommand, SetMetaCommand } from '../lib/commands/settings'
  import { t } from '../lib/i18n/index.svelte'
  import { MAX_MAP_SIZE, MIN_MAP_SIZE } from '../lib/model/defaults'
  import type { GridSettings } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'

  function setGrid(patch: Partial<GridSettings>) {
    const changed = (Object.keys(patch) as (keyof GridSettings)[]).some(
      (k) => patch[k] !== editor.grid[k],
    )
    if (changed) editor.execute(new SetGridCommand(patch))
  }

  function setSize(dimension: 'width' | 'height', input: HTMLInputElement) {
    const value = Math.round(Number(input.value))
    if (!Number.isFinite(value)) {
      input.value = String(editor.grid[dimension])
      return
    }
    const clamped = Math.min(MAX_MAP_SIZE, Math.max(MIN_MAP_SIZE, value))
    input.value = String(clamped)
    setGrid({ [dimension]: clamped })
  }

  function setName(input: HTMLInputElement) {
    const name = input.value.trim()
    if (name !== editor.meta.name) editor.execute(new SetMetaCommand({ name }))
  }
</script>

<label>
  <span>{t('map.name')}</span>
  <input
    type="text"
    value={editor.meta.name}
    placeholder={t('map.untitled')}
    onchange={(e) => setName(e.currentTarget)}
  />
</label>

<div class="row">
  <label>
    <span>{t('map.width')}</span>
    <input
      type="number"
      min={MIN_MAP_SIZE}
      max={MAX_MAP_SIZE}
      value={editor.grid.width}
      onchange={(e) => setSize('width', e.currentTarget)}
    />
  </label>
  <label>
    <span>{t('map.height')}</span>
    <input
      type="number"
      min={MIN_MAP_SIZE}
      max={MAX_MAP_SIZE}
      value={editor.grid.height}
      onchange={(e) => setSize('height', e.currentTarget)}
    />
  </label>
</div>

<label>
  <span>{t('map.orientation')}</span>
  <select
    value={editor.grid.orientation}
    onchange={(e) => setGrid({ orientation: e.currentTarget.value as GridSettings['orientation'] })}
  >
    <option value="flat">{t('map.flat')}</option>
    <option value="pointy">{t('map.pointy')}</option>
  </select>
</label>

<label>
  <span>{t('map.coordFormat')}</span>
  <select
    value={editor.grid.coordFormat}
    onchange={(e) => setGrid({ coordFormat: e.currentTarget.value as GridSettings['coordFormat'] })}
  >
    <option value="CCRR">{t('map.coordCCRR')}</option>
    <option value="axial">{t('map.coordAxial')}</option>
  </select>
</label>

<label class="check">
  <input
    type="checkbox"
    checked={editor.grid.showCoords}
    onchange={(e) => setGrid({ showCoords: e.currentTarget.checked })}
  />
  <span>{t('map.showCoords')}</span>
</label>

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
  }

  label.check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: var(--text);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 5px 8px;
    font: inherit;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }
</style>
