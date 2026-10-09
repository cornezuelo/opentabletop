<script lang="ts">
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import {
    exportPdf,
    exportPng,
    gridSizeMm,
    PDF_DPI,
    PNG_PIXELS_PER_HEX,
    TILE_OVERLAP_MM,
    tiles,
  } from '../lib/io/export'
  import { PAPERS, paperSize, type PaperId } from '../lib/print/paper'
  import { editor } from '../lib/store/editor.svelte'
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'

  let pixelsPerHex = $state<number>(100)
  let transparent = $state(false)
  let dpi = $state<number>(300)
  let busy = $state(false)
  /** Empty hexes white on paper and in the PNG (saves ink). */
  let emptyWhite = $state(false)
  /** Splits the PDF into pages of a paper, overlapping a little, to print a big map at home. */
  let tiled = $state(false)
  let tilePaper = $state<PaperId>(editor.print.paper ?? 'A4')
  let tileLandscape = $state(false)
  /** How many pages the map takes, before exporting (the grid's size, near enough). */
  const tilePages = $derived.by(() => {
    void editor.revision
    const page = paperSize(tilePaper, tileLandscape, editor.print.customPaper)
    const all = tiles(gridSizeMm(), page, editor.print.marginMm)
    return {
      count: all.length,
      columns: Math.max(...all.map((p) => p.column)) + 1,
      rows: Math.max(...all.map((p) => p.row)) + 1,
    }
  })

  const mm = $derived(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }))
  const gridMm = $derived.by(() => {
    void editor.revision
    return gridSizeMm()
  })

  async function run(task: () => Promise<string>) {
    busy = true
    // Let the UI show the busy state before the (synchronous) render blocks the thread.
    await new Promise((resolve) => setTimeout(resolve, 30))
    try {
      showToast(await task())
    } catch (error) {
      console.error(error)
      showToast(t('export.error'), 'error')
    } finally {
      busy = false
    }
  }

  const png = () =>
    run(async () => {
      const result = await exportPng(pixelsPerHex, transparent, emptyWhite)
      const done = t('export.pngDone', { w: result.width, h: result.height })
      return result.pixelsPerHex < pixelsPerHex
        ? `${done} ${t('export.reduced', { value: `${result.pixelsPerHex} px/hex` })}`
        : done
    })

  const pdf = () =>
    run(async () => {
      const result = await exportPdf(dpi, {
        emptyWhite,
        ...(tiled && { tile: { paper: tilePaper, landscape: tileLandscape } }),
      })
      const size = { w: mm.format(result.page.width), h: mm.format(result.page.height) }
      let message =
        result.tiles.columns * result.tiles.rows > 1
          ? t('export.pdfTiled', {
              ...size,
              pages: result.tiles.columns * result.tiles.rows,
              columns: result.tiles.columns,
              rows: result.tiles.rows,
            })
          : t('export.pdfDone', size)
      if (result.dpi < dpi) message += ` ${t('export.reduced', { value: `${result.dpi} dpi` })}`
      if (result.overflows) message += ` ${t('export.overflow')}`
      return message
    })
</script>

<p class="help">{t('export.layersNote')}</p>
<label class="check">
  <input type="checkbox" bind:checked={emptyWhite} />
  <span>{t('export.emptyWhite')}<InfoTip text={t('export.emptyWhiteHelp')} /></span>
</label>

<h2>PNG</h2>
<label class="field">
  <span>{t('export.pixelsPerHex')}</span>
  <select bind:value={pixelsPerHex}>
    {#each PNG_PIXELS_PER_HEX as value (value)}
      <option {value}>{value} px</option>
    {/each}
  </select>
</label>
<label class="check">
  <input type="checkbox" bind:checked={transparent} />
  {t('export.transparent')}
</label>
<button class="primary" disabled={busy} onclick={png}>{t('export.png')}</button>

<h2>PDF</h2>
<p class="help">
  {t('export.scaleNote', { mm: mm.format(editor.print.hexMm) })}
  {t('export.gridSize', { w: mm.format(gridMm.width), h: mm.format(gridMm.height) })}
  {editor.print.paper ? t('export.onPaper') : t('export.fitPage')}
</p>
<label class="field">
  <span>{t('export.dpi')}</span>
  <select bind:value={dpi}>
    {#each PDF_DPI as value (value)}
      <option {value}>{value} dpi</option>
    {/each}
  </select>
</label>
<label class="check">
  <input type="checkbox" bind:checked={tiled} />
  <span>{t('export.tiled')}<InfoTip text={t('export.tiledHelp', { mm: TILE_OVERLAP_MM })} /></span>
</label>
{#if tiled}
  <div class="row">
    <select bind:value={tilePaper} aria-label={t('export.tilePaper')}>
      {#each [...Object.keys(PAPERS), 'custom'] as id (id)}
        <option value={id}>{t(`papers.${id}` as MessageKey)}</option>
      {/each}
    </select>
    <label class="check">
      <input type="checkbox" bind:checked={tileLandscape} />
      {t('export.landscape')}
    </label>
  </div>
  <p class="help">
    {t('export.tilePages', {
      pages: tilePages.count,
      columns: tilePages.columns,
      rows: tilePages.rows,
      mm: TILE_OVERLAP_MM,
    })}
  </p>
{/if}
<button class="primary" disabled={busy} onclick={pdf}>{t('export.pdf')}</button>

<style>
  h2 {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--accent);
  }

  select {
    width: 100%;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .row select {
    width: auto;
    flex: 1;
  }

  .primary {
    padding: 7px 12px;
    color: var(--accent);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
