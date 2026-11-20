<script lang="ts">
  import { cellCenter } from '@open-tabletop/hex'
  import type { MapUnderlay } from '@open-tabletop/map'
  import { getImage } from '@open-tabletop/storage'
  import { ImagePicker, InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { SetUnderlayCommand, type UnderlayState } from '../lib/commands/settings'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * The picture under the map (docs/character-pictures.md §10): chosen from the image library
   * (copied into the map's images, so its file shows it), fitted by hand (its size and where it
   * lies, in cells) and the cells made see-through over it. Every change is one step of undo; a
   * slider shows it live and keeps one step when let go.
   */
  const underlay = $derived((void editor.revision, editor.map.underlay))
  let picking = $state(false)

  /** The cells' extent in world units: where a picture fitted to the map lies. */
  const fit = $derived.by(() => {
    void editor.revision
    const grid = editor.map.grid
    const a = cellCenter({ col: 0, row: 0 }, grid, grid.hexSize)
    const b = cellCenter({ col: grid.width - 1, row: grid.height - 1 }, grid, grid.hexSize)
    const x = Math.min(a.x, b.x) - grid.hexSize
    const y = Math.min(a.y, b.y) - grid.hexSize
    return { x, y, width: Math.max(a.x, b.x) + grid.hexSize - x }
  })
  /** One cell to the right and one down, in world units. */
  const step = $derived.by(() => {
    void editor.revision
    const grid = editor.map.grid
    const o = cellCenter({ col: 0, row: 0 }, grid, grid.hexSize)
    const right = cellCenter({ col: 1, row: 0 }, grid, grid.hexSize)
    const down = cellCenter({ col: 0, row: 1 }, grid, grid.hexSize)
    return { x: Math.abs(right.x - o.x) || 1, y: Math.abs(down.y - o.y) || 1 }
  })

  const snapshot = (): UnderlayState => ({
    ...(editor.map.underlay && { underlay: structuredClone(editor.map.underlay) }),
    assets: [...editor.map.assets],
  })

  async function choose(id: string | undefined) {
    const before = snapshot()
    if (!id) return remove()
    const image = await getImage(id).catch(() => null)
    if (!image) return showToast(t('underlay.title'), 'error')
    const assets = before.assets.some((a) => a.id === id)
      ? before.assets
      : [...before.assets, { id, name: image.name, dataUrl: image.data }]
    const kept = before.underlay
    const next: MapUnderlay = kept
      ? { ...kept, asset: id }
      : { asset: id, x: fit.x, y: fit.y, width: fit.width, cells: 0.5 }
    editor.execute(
      new SetUnderlayCommand(before, { underlay: next, assets: withoutOld(assets, kept, id) }),
    )
  }

  /** The map's images without the picture it showed before, unless something else shows it. */
  function withoutOld(
    assets: UnderlayState['assets'],
    kept: MapUnderlay | undefined,
    now?: string,
  ): UnderlayState['assets'] {
    if (!kept || kept.asset === now) return assets
    const used = JSON.stringify({ ...editor.map, assets: [], underlay: undefined }).includes(
      `asset:${kept.asset}`,
    )
    return used ? assets : assets.filter((a) => a.id !== kept.asset)
  }

  function remove() {
    const before = snapshot()
    editor.execute(
      new SetUnderlayCommand(before, { assets: withoutOld(before.assets, before.underlay) }),
    )
  }

  /** The fitting before a slider moved, to keep one step of undo when it's let go. */
  let live: UnderlayState | null = null
  function preview(patch: Partial<MapUnderlay>) {
    const under = editor.map.underlay
    if (!under) return
    live ??= snapshot()
    Object.assign(under, patch)
    editor.notify({ kind: 'underlay' })
  }
  function commit(patch: Partial<MapUnderlay> = {}) {
    const under = editor.map.underlay
    if (!under) return
    const before = live ?? snapshot()
    live = null
    const after = { underlay: { ...under, ...patch }, assets: [...editor.map.assets] }
    // Back as it was, then forward as one step.
    if (before.underlay) editor.map.underlay = before.underlay
    if (JSON.stringify(before.underlay) === JSON.stringify(after.underlay))
      return editor.notify({ kind: 'underlay' })
    editor.execute(new SetUnderlayCommand(before, after))
  }

  const percent = (v: number) => Math.round(v * 1000) / 10
  const cellsOf = (v: number, unit: number) => Math.round((v / unit) * 100) / 100
  const number = (input: HTMLInputElement) => {
    const value = Number(input.value)
    return input.value.trim() !== '' && Number.isFinite(value) ? value : undefined
  }
</script>

<p class="help">{t('underlay.help')}</p>

{#if underlay}
  <div class="buttons">
    <button onclick={() => (picking = true)}>{t('underlay.change')}</button>
    <button onclick={remove}>{t('underlay.remove')}</button>
    <button onclick={() => commit({ x: fit.x, y: fit.y, width: fit.width })}
      >{t('underlay.fit')}</button
    >
  </div>
  <label class="check">
    <input
      type="checkbox"
      checked={!underlay.hidden}
      onchange={(e) => commit({ hidden: e.currentTarget.checked ? undefined : true })}
    />
    {t('underlay.show')}
  </label>
  <div class="grid">
    <span>{t('underlay.size')}<InfoTip markdown={t('underlay.sizeHelp')} /></span>
    <input
      type="range"
      min="10"
      max="400"
      step="0.1"
      value={percent(underlay.width / fit.width)}
      oninput={(e) => preview({ width: (Number(e.currentTarget.value) / 100) * fit.width })}
      onchange={() => commit()}
    />
    <input
      type="number"
      step="0.1"
      min="1"
      value={percent(underlay.width / fit.width)}
      onchange={(e) => {
        const v = number(e.currentTarget)
        if (v && v > 0) commit({ width: (v / 100) * fit.width })
      }}
    /><span class="unit">%</span>

    <span>{t('underlay.right')}<InfoTip markdown={t('underlay.moveHelp')} /></span>
    <input
      type="range"
      min="-10"
      max="10"
      step="0.01"
      value={cellsOf(underlay.x - fit.x, step.x)}
      oninput={(e) => preview({ x: fit.x + Number(e.currentTarget.value) * step.x })}
      onchange={() => commit()}
    />
    <input
      type="number"
      step="0.01"
      value={cellsOf(underlay.x - fit.x, step.x)}
      onchange={(e) => {
        const v = number(e.currentTarget)
        if (v !== undefined) commit({ x: fit.x + v * step.x })
      }}
    /><span class="unit"></span>

    <span>{t('underlay.down')}<InfoTip markdown={t('underlay.moveHelp')} /></span>
    <input
      type="range"
      min="-10"
      max="10"
      step="0.01"
      value={cellsOf(underlay.y - fit.y, step.y)}
      oninput={(e) => preview({ y: fit.y + Number(e.currentTarget.value) * step.y })}
      onchange={() => commit()}
    />
    <input
      type="number"
      step="0.01"
      value={cellsOf(underlay.y - fit.y, step.y)}
      onchange={(e) => {
        const v = number(e.currentTarget)
        if (v !== undefined) commit({ y: fit.y + v * step.y })
      }}
    /><span class="unit"></span>

    <span>{t('underlay.cells')}<InfoTip markdown={t('underlay.cellsHelp')} /></span>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      value={Math.round(underlay.cells * 100)}
      oninput={(e) => preview({ cells: Number(e.currentTarget.value) / 100 })}
      onchange={() => commit()}
    />
    <span class="value">{Math.round(underlay.cells * 100)}</span><span class="unit">%</span>
  </div>
{:else}
  <button onclick={() => (picking = true)}>{t('underlay.choose')}</button>
{/if}

<ImagePicker
  bind:open={picking}
  locale={getLocale()}
  title={t('underlay.pickerTitle')}
  shape="map"
  current={underlay?.asset}
  onpick={(id) => void choose(id)}
/>

<style>
  .help {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .check {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
  }

  .grid {
    display: grid;
    grid-template-columns: auto minmax(60px, 1fr) 64px auto;
    gap: 6px 8px;
    align-items: center;
    font-size: 12px;
  }

  .grid input[type='range'] {
    accent-color: var(--accent);
  }

  .grid input[type='number'] {
    width: 64px;
  }

  .value {
    text-align: right;
  }

  .unit {
    color: var(--text-muted);
  }
</style>
