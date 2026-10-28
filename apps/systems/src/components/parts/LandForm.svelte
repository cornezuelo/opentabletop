<script lang="ts">
  import {
    landPatch,
    landShares,
    landTerrains,
    validateLand,
    type LandModel,
  } from '@open-tabletop/land-engine'
  import { DEFAULT_TERRAINS, TERRAIN_SETS } from '@open-tabletop/map'
  import { seeded } from '@open-tabletop/random'
  import type { TravelSystem } from '@open-tabletop/session'
  import { confirmAction, InfoTip, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { PALETTE, terrainName } from '../../lib/terrains'

  /**
   * A land model (`kind: land`) as forms: for each terrain, how likely a hex next to it is
   * to be each terrain (a grid), where nothing around is known, how much the hex it's seen
   * from counts; a seeded patch of land grown from it, and its mix.
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  type Raw = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const next = $derived((data.next ?? {}) as Record<string, Record<string, number> | null>)
  const start = $derived((data.start ?? {}) as Record<string, number>)
  /** Every terrain it names, its rows' first. */
  const terrains = $derived(landTerrains({ next, start } as LandModel))
  /** Terrains to add: the rules' and the palette's it doesn't name yet. */
  const free = $derived(
    [...new Set([...Object.keys(system.rules.terrains ?? {}), ...PALETTE])].filter(
      (id) => !terrains.includes(id),
    ),
  )
  let newTerrain = $state('')
  let seed = $state('land')

  const weight = (from: string | null, to: string) =>
    (from === null ? start[to] : next[from]?.[to]) ?? ''
  function setWeight(from: string | null, to: string, raw: string) {
    const value = raw.trim() === '' ? undefined : Number(raw)
    const row = { ...(from === null ? start : (next[from] ?? {})) } as Raw
    if (value === undefined || value === 0 || !Number.isFinite(value)) delete row[to]
    else row[to] = value
    const kept = Object.keys(row).length ? row : undefined
    if (from === null) doc.edit('', ['start'], kept)
    else doc.edit('', ['next', from], kept ?? {})
  }
  function addTerrain() {
    const id = newTerrain.trim()
    if (!id || id in next) return
    // A new terrain goes on as itself, until weighed otherwise.
    doc.edit('', ['next', id], { [id]: 1 })
    newTerrain = ''
  }
  async function removeTerrain(id: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: terrainName(id) })))) return
    doc.edit('', ['next', id], undefined)
  }

  /** The model as it is, if valid: a patch grown from it and its mix. */
  const model = $derived(validateLand(data).length ? null : (data as unknown as LandModel))
  const SIZE = 12
  const patch = $derived(model ? landPatch(model, seeded(`patch/${seed}`), SIZE) : null)
  const shares = $derived(
    model
      ? new Map(landShares(model, seeded(`shares/${seed}`)).map((s) => [s.terrain, s.share]))
      : null,
  )
  const percent = (n: number | undefined) => `${Math.round((n ?? 0) * 100)} %`
  /** A terrain's colour on the Hexmapper's palettes (grey for one they lack). */
  const colours = new Map<string, string>(
    [...DEFAULT_TERRAINS, ...Object.values(TERRAIN_SETS).flat()].map((tt) => [tt.id, tt.color]),
  )
  const colour = (id: string) => colours.get(id) ?? '#888'
  /** A pointy hex of the patch (`col,row`, odd rows shifted right). */
  const R = 10
  const W = Math.sqrt(3) * R
  const hexPoints = (key: string) => {
    const [c, r] = key.split(',').map(Number)
    const x = W * (c + (r % 2 ? 0.5 : 0)) + W / 2
    const y = 1.5 * R * r + R
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30)
      return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  }
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('land.name')}<InfoTip text={t('land.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label>
      <span>{t('land.from')}<InfoTip text={t('land.fromHelp')} /></span>
      <input
        type="number"
        min="0"
        step="any"
        class="small"
        placeholder="1"
        value={((data.weights as Raw | undefined)?.from as number | undefined) ?? ''}
        {disabled}
        onchange={(e) => {
          const raw = e.currentTarget.value.trim()
          doc.edit(
            '',
            ['weights'],
            raw === '' || Number(raw) === 1 ? undefined : { from: Number(raw) },
          )
        }}
      />
    </label>
  </section>

  <section>
    <h3>{t('land.rows')}<InfoTip text={t('land.rowsHelp')} /></h3>
    <table class="matrix">
      <thead>
        <tr>
          <th class="corner">{t('land.fromTo')}</th>
          {#each terrains as to (to)}<th>{terrainName(to)}</th>{/each}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each terrains as from (from)}
          <tr>
            <th><span class="swatch" style:background={colour(from)}></span>{terrainName(from)}</th>
            {#each terrains as to (to)}
              <td>
                <input
                  type="number"
                  min="0"
                  step="any"
                  aria-label={`${terrainName(from)} → ${terrainName(to)}`}
                  value={from in next ? weight(from, to) : ''}
                  {disabled}
                  onchange={(e) => setWeight(from, to, e.currentTarget.value)}
                />
              </td>
            {/each}
            <td>
              {#if !disabled && from in next}
                <button
                  class="icon"
                  aria-label={t('forms.remove')}
                  use:tooltip={t('forms.remove')}
                  onclick={() => removeTerrain(from)}>×</button
                >
              {/if}
            </td>
          </tr>
        {/each}
        <tr class="start">
          <th>{t('land.start')}<InfoTip text={t('land.startHelp')} /></th>
          {#each terrains as to (to)}
            <td>
              <input
                type="number"
                min="0"
                step="any"
                aria-label={`${t('land.start')} → ${terrainName(to)}`}
                value={weight(null, to)}
                {disabled}
                onchange={(e) => setWeight(null, to, e.currentTarget.value)}
              />
            </td>
          {/each}
          <td></td>
        </tr>
        {#if shares}
          <tr class="shares">
            <th>{t('land.shares')}<InfoTip text={t('land.sharesHelp')} /></th>
            {#each terrains as s (s)}<td>{percent(shares.get(s))}</td>{/each}
            <td></td>
          </tr>
        {/if}
      </tbody>
    </table>
    {#if !disabled}
      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault()
          addTerrain()
        }}
      >
        <SuggestInput
          label={t('land.newTerrain')}
          placeholder={t('land.newTerrain')}
          value={newTerrain}
          list={free}
          onchange={(text) => (newTerrain = text)}
        />
        <button type="submit">{t('land.addTerrain')}</button>
      </form>
    {/if}
  </section>

  {#if patch}
    <section>
      <h3>{t('land.preview')}<InfoTip text={t('land.previewHelp')} /></h3>
      <div class="preview">
        <svg
          viewBox={`0 0 ${(W * (SIZE + 0.5)).toFixed(0)} ${(1.5 * R * SIZE + R / 2).toFixed(0)}`}
          role="img"
          aria-label={t('land.preview')}
        >
          {#each [...patch] as [key, terrain] (key)}
            <polygon points={hexPoints(key)} fill={colour(terrain)}
              ><title>{terrainName(terrain)}</title></polygon
            >
          {/each}
        </svg>
        <button class="link" onclick={() => (seed = Math.random().toString(36).slice(2, 8))}
          >{t('land.again')}</button
        >
      </div>
    </section>
  {/if}
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1100px;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  section.head {
    flex-direction: row;
    gap: 16px;
    align-items: end;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label input[type='text'] {
    width: 20em;
  }

  .small {
    width: 6em;
  }

  .matrix {
    align-self: flex-start;
    border-collapse: collapse;
    font-size: 12px;
  }

  .matrix th {
    padding: 2px 6px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
    white-space: nowrap;
  }

  .matrix td {
    padding: 2px;
  }

  .matrix input {
    width: 4.5em;
  }

  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border: 1px solid rgb(0 0 0 / 0.4);
    border-radius: 2px;
  }

  .start th {
    padding-top: 6px;
  }

  .shares td {
    padding: 4px 6px;
    color: var(--accent);
  }

  .add {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .add button {
    padding: 4px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .preview {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .preview svg {
    width: 280px;
    height: auto;
  }

  .link {
    padding: 0;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
