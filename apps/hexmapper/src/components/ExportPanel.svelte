<script lang="ts">
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { exportPdf, exportPng, gridSizeMm, PDF_DPI, PNG_PIXELS_PER_HEX } from '../lib/io/export'
  import { editor } from '../lib/store/editor.svelte'
  import { showToast } from '@open-tabletop/ui-kit'

  let pixelsPerHex = $state<number>(100)
  let transparent = $state(false)
  let dpi = $state<number>(300)
  let busy = $state(false)

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
      const result = await exportPng(pixelsPerHex, transparent)
      const done = t('export.pngDone', { w: result.width, h: result.height })
      return result.pixelsPerHex < pixelsPerHex
        ? `${done} ${t('export.reduced', { value: `${result.pixelsPerHex} px/hex` })}`
        : done
    })

  const pdf = () =>
    run(async () => {
      const result = await exportPdf(dpi)
      let message = t('export.pdfDone', {
        w: mm.format(result.page.width),
        h: mm.format(result.page.height),
      })
      if (result.dpi < dpi) message += ` ${t('export.reduced', { value: `${result.dpi} dpi` })}`
      if (result.overflows) message += ` ${t('export.overflow')}`
      return message
    })
</script>

<p class="help">{t('export.layersNote')}</p>

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
