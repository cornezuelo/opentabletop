<script lang="ts">
  import { seeded } from '@open-tabletop/random'
  import { confirmAction, InfoTip, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { validateWeather, weatherShares, type WeatherModel } from '@open-tabletop/weather-engine'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows from '../forms/RecordRows.svelte'

  /**
   * A weather model (`kind: weather`) as forms: its kinds of weather (each with what it
   * sets for the day), and per season where the weather starts and, from each kind, how
   * likely tomorrow is to be each kind. Each season shows how often each kind comes up.
   */
  let { doc, seasons: known = [] }: { doc: PartDoc; seasons?: string[] } = $props()

  type Raw = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const states = $derived(Object.keys((data.states ?? {}) as Raw))
  const seasons = $derived((data.seasons ?? {}) as Record<string, Raw | null>)
  const free = $derived(known.filter((s) => !(s in seasons)))
  let newSeason = $state('')

  /** A state's name in the UI's language (its id if it has none). */
  const stateName = (id: string) =>
    doc.text('', ((data.states as Record<string, Raw | null>)[id] ?? {})?.name, [
      'states',
      id,
      'name',
    ]) || id
  const weight = (season: string, from: string, to: string) => {
    const next = (seasons[season]?.next ?? {}) as Record<string, Record<string, number> | null>
    return next[from]?.[to] ?? ''
  }
  function setWeight(season: string, from: string, to: string, raw: string) {
    const value = raw.trim() === '' ? undefined : Number(raw)
    const row = { ...(((seasons[season]?.next ?? {}) as Raw)[from] as Raw | undefined) }
    if (value === undefined || value === 0) delete row[to]
    else row[to] = value
    doc.edit('', ['seasons', season, 'next', from], Object.keys(row).length ? row : undefined)
  }
  function addSeason() {
    const id = newSeason.trim()
    if (!id || id in seasons) return
    doc.edit('', ['seasons', id], { start: states[0] ?? '', next: {} })
    newSeason = ''
  }

  /** How often each kind comes up over a long run, per season (when the model is valid). */
  const shares = $derived.by(() => {
    if (validateWeather(data).length) return null
    const model = data as unknown as WeatherModel
    return Object.fromEntries(
      Object.keys(seasons).map((s) => [s, weatherShares(model, s, 2000, seeded(`shares/${s}`))]),
    )
  })
  const percent = (n: number | undefined) => `${Math.round((n ?? 0) * 100)} %`
</script>

<div class="form">
  <section>
    <label class="name">
      <span>{t('weather.name')}<InfoTip text={t('weather.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
  </section>

  <section>
    <h3>{t('weather.states')}<InfoTip text={t('weather.statesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['states']}
      idLabel={t('forms.id')}
      suggestions={['clear', 'cloudy', 'rain', 'fog', 'storm', 'snow']}
      template={{}}
      columns={[
        { field: 'name', label: t('weather.stateName'), type: 'text' },
        {
          field: 'set',
          label: t('weather.set'),
          help: t('weather.setHelp'),
          type: 'flow',
          placeholder: t('weather.setNothing'),
        },
      ]}
    />
  </section>

  {#each Object.keys(seasons) as season (season)}
    {@const start = seasons[season]?.start}
    {@const flower = seasons[season]?.flower as Raw | undefined}
    {#if flower}
      <section class="season">
        <div class="head">
          <h3>{t('weather.season', { season })}<InfoTip text={t('weather.flowerHelp')} /></h3>
          <label class="start">
            <span>{t('weather.flowerStart')}<InfoTip text={t('weather.flowerStartHelp')} /></span>
            <select
              value={typeof flower.start === 'string' ? flower.start : ''}
              {disabled}
              onchange={(e) =>
                doc.edit(
                  '',
                  ['seasons', season, 'flower', 'start'],
                  e.currentTarget.value || undefined,
                )}
            >
              <option value="">{t('weather.flowerMiddle')}</option>
              {#each states as s (s)}<option value={s}>{stateName(s)}</option>{/each}
            </select>
          </label>
          <label class="start">
            <span>{t('weather.edge')}<InfoTip text={t('weather.edgeHelp')} /></span>
            <select
              value={flower.edge === 'stay' ? 'stay' : 'wrap'}
              {disabled}
              onchange={(e) =>
                doc.edit(
                  '',
                  ['seasons', season, 'flower', 'edge'],
                  e.currentTarget.value === 'stay' ? 'stay' : undefined,
                )}
            >
              <option value="wrap">{t('weather.edgeWrap')}</option>
              <option value="stay">{t('weather.edgeStay')}</option>
            </select>
          </label>
          {#if !disabled}
            <button
              class="link"
              onclick={async () =>
                (await confirmAction(t('weather.toWeightsConfirm'))) &&
                doc.edit('', ['seasons', season], { start: states[0] ?? '', next: {} })}
              >{t('weather.toWeights')}</button
            >
          {/if}
        </div>
        <div class="flower" role="group" aria-label={t('weather.season', { season })}>
          {#each (flower.rows as string[][] | undefined) ?? [] as row, i (i)}
            <div class="flower-row">
              {#each row as cell, j (j)}
                <select
                  aria-label={`${i + 1}.${j + 1}`}
                  value={cell}
                  {disabled}
                  onchange={(e) =>
                    doc.edit(
                      '',
                      ['seasons', season, 'flower', 'rows', i, j],
                      e.currentTarget.value,
                    )}
                >
                  {#each states as s (s)}<option value={s}>{stateName(s)}</option>{/each}
                </select>
              {/each}
            </div>
          {/each}
        </div>
        {#if shares?.[season]}
          <p class="help">
            {t('weather.shares')}: {states
              .map((s) => `${stateName(s)} ${percent(shares[season][s])}`)
              .join(' · ')}
          </p>
        {/if}
      </section>
    {:else}
      <section class="season">
        <div class="head">
          <h3>{t('weather.season', { season })}</h3>
          <label class="start">
            <span>{t('weather.start')}<InfoTip text={t('weather.startHelp')} /></span>
            <select
              value={typeof start === 'string' ? start : ''}
              {disabled}
              onchange={(e) => doc.edit('', ['seasons', season, 'start'], e.currentTarget.value)}
            >
              {#if typeof start !== 'string'}<option value="">{t('weather.startWeights')}</option
                >{/if}
              {#each states as s (s)}<option value={s}>{stateName(s)}</option>{/each}
            </select>
          </label>
          {#if !disabled}
            <button
              class="icon"
              aria-label={t('forms.remove')}
              use:tooltip={t('forms.remove')}
              onclick={async () =>
                (await confirmAction(t('forms.confirmRemove', { name: season }))) &&
                doc.edit('', ['seasons', season], undefined)}>×</button
            >
          {/if}
        </div>
        <table class="matrix">
          <thead>
            <tr>
              <th class="corner">{t('weather.fromTo')}<InfoTip text={t('weather.matrixHelp')} /></th
              >
              {#each states as to (to)}<th>{stateName(to)}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each states as from (from)}
              <tr>
                <th>{stateName(from)}</th>
                {#each states as to (to)}
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      aria-label={`${stateName(from)} → ${stateName(to)}`}
                      value={weight(season, from, to)}
                      {disabled}
                      onchange={(e) => setWeight(season, from, to, e.currentTarget.value)}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
            {#if shares?.[season]}
              <tr class="shares">
                <th>{t('weather.shares')}<InfoTip text={t('weather.sharesHelp')} /></th>
                {#each states as s (s)}<td>{percent(shares[season][s])}</td>{/each}
              </tr>
            {/if}
          </tbody>
        </table>
        {#if !disabled}
          <button
            class="link"
            onclick={async () =>
              (await confirmAction(t('weather.toFlowerConfirm'))) &&
              doc.edit('', ['seasons', season], {
                flower: {
                  rows: [3, 4, 5, 4, 3].map((n) =>
                    Array.from({ length: n }, () => states[0] ?? ''),
                  ),
                },
              })}>{t('weather.toFlower')}</button
          >
        {/if}
      </section>
    {/if}
  {/each}

  {#if !disabled}
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault()
        addSeason()
      }}
    >
      <SuggestInput
        label={t('weather.newSeason')}
        placeholder={t('weather.newSeason')}
        value={newSeason}
        list={free}
        onchange={(text) => (newSeason = text)}
      />
      <button type="submit">{t('weather.addSeason')}</button>
    </form>
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

  .name input {
    width: 20em;
  }

  .head {
    display: flex;
    gap: 16px;
    align-items: end;
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
    width: 5em;
  }

  .shares td {
    padding: 4px 6px;
    color: var(--accent);
  }

  .icon {
    height: 30px;
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

  .flower {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .flower-row {
    display: flex;
    gap: 4px;
  }

  .flower-row select {
    width: 8em;
  }

  .link {
    align-self: flex-start;
    padding: 0;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
