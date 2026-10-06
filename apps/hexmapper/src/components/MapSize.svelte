<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import { MAX_MAP_SIZE, MIN_MAP_SIZE } from '../lib/model/defaults'
  import {
    cornerToCorner,
    HEX_PRESETS_MM,
    mapSizeMm,
    PAPERS,
    smallestPaper,
    type PaperId,
  } from '../lib/print/paper'
  import { editor } from '../lib/store/editor.svelte'
  import { applySettings } from '../lib/store/settings'

  const paperIds = [...Object.keys(PAPERS), 'custom'] as PaperId[]
  const presetLabels: Record<number, string> = {
    19.05: '¾"',
    25: '25',
    25.4: '1"',
    30: '30',
    38.1: '1½"',
  }

  const mm = $derived(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }))
  const printed = $derived(
    mapSizeMm(editor.grid.width, editor.grid.height, editor.grid.orientation, editor.print.hexMm),
  )
  const fitsOn = $derived(smallestPaper(printed, editor.print.marginMm))

  /** Reads a positive number from an input, restoring `fallback` if invalid. */
  function readNumber(input: HTMLInputElement, fallback: number, min = 0.01): number | null {
    const value = Number(input.value.replace(',', '.'))
    if (!Number.isFinite(value) || value < min) {
      input.value = String(fallback)
      return null
    }
    return value
  }

  function setCount(dimension: 'width' | 'height', input: HTMLInputElement) {
    const value = readNumber(input, editor.grid[dimension], MIN_MAP_SIZE)
    if (value === null) return
    const clamped = Math.min(MAX_MAP_SIZE, Math.round(value))
    input.value = String(clamped)
    applySettings({ grid: { [dimension]: clamped } })
  }

  function setCustomPaper(dimension: 'width' | 'height', input: HTMLInputElement) {
    const value = readNumber(input, editor.print.customPaper[dimension])
    if (value !== null)
      applySettings({ print: { customPaper: { ...editor.print.customPaper, [dimension]: value } } })
  }
</script>

<div class="field">
  <div class="segmented" role="radiogroup" aria-label={t('map.size')}>
    <button
      role="radio"
      aria-checked={editor.print.paper === null}
      class:active={editor.print.paper === null}
      onclick={() => applySettings({ print: { paper: null } })}>{t('map.sizeByHexes')}</button
    >
    <button
      role="radio"
      aria-checked={editor.print.paper !== null}
      class:active={editor.print.paper !== null}
      onclick={() => editor.print.paper === null && applySettings({ print: { paper: 'A4' } })}
      >{t('map.sizeByPaper')}</button
    >
  </div>
</div>

{#if editor.print.paper === null}
  <div class="row">
    <label class="field">
      <span>{t('map.columns')}</span>
      <input
        type="number"
        min={MIN_MAP_SIZE}
        max={MAX_MAP_SIZE}
        value={editor.grid.width}
        onchange={(e) => setCount('width', e.currentTarget)}
      />
    </label>
    <label class="field">
      <span>{t('map.rows')}</span>
      <input
        type="number"
        min={MIN_MAP_SIZE}
        max={MAX_MAP_SIZE}
        value={editor.grid.height}
        onchange={(e) => setCount('height', e.currentTarget)}
      />
    </label>
  </div>
{:else}
  <div class="row">
    <label class="field">
      <span>{t('map.paper')}</span>
      <select
        value={editor.print.paper}
        onchange={(e) => applySettings({ print: { paper: e.currentTarget.value as PaperId } })}
      >
        {#each paperIds as id (id)}
          <option value={id}>{t(`papers.${id}` as MessageKey)}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>{t('map.paperOrientation')}</span>
      <select
        value={editor.print.landscape ? 'landscape' : 'portrait'}
        onchange={(e) =>
          applySettings({ print: { landscape: e.currentTarget.value === 'landscape' } })}
      >
        <option value="portrait">{t('map.portrait')}</option>
        <option value="landscape">{t('map.landscape')}</option>
      </select>
    </label>
  </div>
  {#if editor.print.paper === 'custom'}
    <div class="row">
      <label class="field">
        <span>{t('map.customWidth')}</span>
        <input
          type="number"
          min="1"
          value={editor.print.customPaper.width}
          onchange={(e) => setCustomPaper('width', e.currentTarget)}
        />
      </label>
      <label class="field">
        <span>{t('map.customHeight')}</span>
        <input
          type="number"
          min="1"
          value={editor.print.customPaper.height}
          onchange={(e) => setCustomPaper('height', e.currentTarget)}
        />
      </label>
    </div>
  {/if}
  <label class="field">
    <span>{t('map.margin')}</span>
    <input
      type="number"
      min="0"
      value={editor.print.marginMm}
      onchange={(e) => {
        const v = readNumber(e.currentTarget, editor.print.marginMm, 0)
        if (v !== null) applySettings({ print: { marginMm: v } })
      }}
    />
  </label>
  <p class="result">
    {t('map.fitResult', { cols: editor.grid.width, rows: editor.grid.height })}
  </p>
{/if}

<div class="field">
  <span>{t('map.hexMm')}<InfoTip text={t('map.hexMmHelp')} /></span>
  <div class="hex-size">
    <input
      type="number"
      min="1"
      step="0.1"
      value={editor.print.hexMm}
      onchange={(e) => {
        const v = readNumber(e.currentTarget, editor.print.hexMm, 1)
        if (v !== null) applySettings({ print: { hexMm: v } })
      }}
    />
    {#each HEX_PRESETS_MM as preset (preset)}
      <button
        class="preset"
        class:active={editor.print.hexMm === preset}
        onclick={() => applySettings({ print: { hexMm: preset } })}>{presetLabels[preset]}</button
      >
    {/each}
  </div>
</div>

<ul class="info">
  <li>{t('map.cornerToCorner', { mm: mm.format(cornerToCorner(editor.print.hexMm)) })}</li>
  <li>{t('map.printedSize', { w: mm.format(printed.width), h: mm.format(printed.height) })}</li>
  {#if editor.print.paper === null}
    <li>
      {#if fitsOn}
        {t('map.fitsOn', {
          paper: t(`papers.${fitsOn.paper}` as MessageKey),
          orientation: t(fitsOn.landscape ? 'map.landscape' : 'map.portrait').toLowerCase(),
        })}
      {:else}
        {t('map.fitsNone')}
      {/if}
    </li>
  {/if}
</ul>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
  }

  .segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .segmented button,
  .preset {
    padding: 5px 6px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .segmented button.active,
  .preset.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .hex-size {
    display: flex;
    gap: 4px;
  }

  .hex-size input {
    flex: 1;
  }

  .preset {
    flex: none;
    min-width: 32px;
  }

  .result {
    margin: 0;
    color: var(--accent);
  }

  .info {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.6;
  }
</style>
