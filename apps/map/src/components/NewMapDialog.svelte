<script lang="ts">
  import { MAP_TEMPLATES, type MapStart, type MapTemplate } from '@open-tabletop/map'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { newMapDialog, type NewMapAsked } from '../lib/io/newMapDialog.svelte'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * One way of starting a map, whatever it's for: its cells and scale, and a template to
   * start from, which fills them in and stays changeable. A sub-map is made here too.
   */
  let { asked }: { asked: NewMapAsked } = $props()

  /** What a template fills in. */
  const CELLS: Record<MapTemplate, NonNullable<MapStart['cells']>> = {
    blank: 'hex',
    dungeon: 'square',
    town: 'square',
  }
  const SQUARE_KM = '0.003'

  // A sub-map is a site at first: what New sub-map always made.
  const first: MapTemplate = asked.subMap ? 'dungeon' : 'blank'
  let name = $state(asked.name ?? '')
  let template = $state<MapTemplate>(first)
  let cells = $state(CELLS[first])
  let km = $state(CELLS[first] === 'square' ? SQUARE_KM : '')
  let under = $state(!!asked.subMap || (!!asked.under && !!asked.place))
  let dialog: HTMLDialogElement

  const cell = $derived(
    asked.place
      ? formatCoord(parseKey(asked.place), editor.grid.coordFormat, editor.grid)
      : undefined,
  )

  $effect(() => {
    dialog.showModal()
  })

  function choose(next: MapTemplate) {
    template = next
    cells = CELLS[next]
    km = cells === 'square' ? SQUARE_KM : ''
  }

  function create() {
    const cellKm = Number(km)
    newMapDialog.answer({
      name: name.trim(),
      start: { template, cells, ...(km.trim() && cellKm > 0 && { cellKm }) },
      ...(under && asked.place && { under: asked.place }),
    })
  }
</script>

<dialog class="modal" bind:this={dialog} onclose={() => newMapDialog.answer(null)}>
  <form
    onsubmit={(e) => {
      e.preventDefault()
      create()
    }}
  >
    <h2>{asked.subMap ? t('newMap.subMapTitle') : t('newMap.title')}</h2>
    <label class="field">
      <span>{t('newMap.name')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" autofocus bind:value={name} />
    </label>
    <label class="field">
      <span>{t('newMap.template')}<InfoTip markdown={t('newMap.templateHelp')} /></span>
      <select value={template} onchange={(e) => choose(e.currentTarget.value as MapTemplate)}>
        {#each MAP_TEMPLATES as id (id)}
          <option value={id}>{t(`newMap.templates.${id}`)}</option>
        {/each}
      </select>
    </label>
    <div class="row">
      <label class="field">
        <span>{t('map.cells')}<InfoTip text={t('map.cellsHelp')} /></span>
        <select bind:value={cells}>
          <option value="hex">{t('map.cellsHex')}</option>
          <option value="square">{t('map.cellsSquare')}</option>
        </select>
      </label>
      <label class="field">
        <span>{t('map.cellKm')}<InfoTip text={t('map.cellKmHelp')} /></span>
        <input type="text" inputmode="decimal" bind:value={km} />
      </label>
    </div>
    {#if !asked.subMap}
      {#if cell}
        <label class="check">
          <input type="checkbox" bind:checked={under} />
          {t('newMap.under', { cell })}<InfoTip text={t('submap.help')} />
        </label>
      {:else}
        <p class="hint">{t('newMap.underHint')}</p>
      {/if}
    {/if}
    <div class="actions">
      <button type="button" class="button" onclick={() => dialog.close()}
        >{t('newMap.cancel')}</button
      >
      <button type="submit" class="button primary">{t('newMap.make')}</button>
    </div>
  </form>
</dialog>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(440px, 90vw);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: end;
  }

  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
