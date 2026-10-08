<script lang="ts">
  import { InfoTip, showToast, SuggestInput } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { t } from '../../lib/i18n'
  import { actionIds, type SystemDoc } from '../../lib/systemDoc.svelte'
  import { edgeName, terrainName, PALETTE } from '../../lib/terrains'
  import { contextSuggestions } from '@open-tabletop/session'
  import {
    BLOCKABLE,
    modeThrough,
    olderEatingEdits,
    parseTravelRules,
  } from '@open-tabletop/travel-engine'
  import { library } from '../../lib/packs.svelte'
  import ActionsForm from './ActionsForm.svelte'
  import RecordRows from './RecordRows.svelte'

  /** Travel rules as forms: the day, terrains, roads, modes, supplies, weather and actions. */
  let { doc }: { doc: SystemDoc } = $props()

  const rules = $derived(doc.rules as Record<string, Record<string, unknown> | undefined>)
  const disabled = $derived(!doc.editable)
  /** Rules that eat the older way: the edits that write it as a day-end action. */
  const olderEating = $derived.by(() => {
    const parsed = parseTravelRules(doc.rules).rules
    return parsed ? olderEatingEdits(parsed) : []
  })
  function convertEating() {
    for (const { path, value } of olderEating) doc.edit('travel-rules', path.map(String), value)
  }

  /** What a terrain's conditions read: the hex entered, the step, the calendar, today. */
  const passableHints = $derived({
    ...contextSuggestions(library.registry),
    terrain: [...PALETTE, ...Object.keys(doc.rules.terrains ?? {})],
    water: ['true', 'false'],
  })
  const waterPassable = $derived(
    typeof rules.water?.passable === 'object'
      ? (rules.water.passable as Record<string, unknown>)
      : undefined,
  )
  const conditionText = (value: unknown) =>
    value === undefined ? '' : flowText(value).replace(/^\{\s*|\s*\}$/g, '')
  function setWaterPassable(key: 'when' | 'unless', text: string) {
    const value = text.trim() ? parseFlow(text) : undefined
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    const next: Record<string, unknown> = { ...waterPassable, [key]: value }
    if (value === undefined) delete next[key]
    doc.edit('travel-rules', ['water', 'passable'], Object.keys(next).length ? next : undefined)
  }

  const num = (input: HTMLInputElement) =>
    input.value.trim() === '' ? undefined : Number(input.value)
</script>

<div class="form">
  <section>
    <h3>{t('rules.day')}<InfoTip text={t('rules.dayHelp')} /></h3>
    <div class="inline">
      <label>
        <span>{t('rules.start')}</span>
        <input
          type="time"
          value={rules.day?.start ?? ''}
          {disabled}
          onchange={(e) => doc.edit('travel-rules', ['day', 'start'], e.currentTarget.value)}
        />
      </label>
      <label>
        <span>{t('rules.nightfall')}</span>
        <input
          type="time"
          value={rules.day?.nightfall ?? ''}
          {disabled}
          onchange={(e) => doc.edit('travel-rules', ['day', 'nightfall'], e.currentTarget.value)}
        />
      </label>
      <label>
        <span>{t('rules.hoursPerDay')}<InfoTip text={t('rules.hoursPerDayHelp')} /></span>
        <input
          type="number"
          min="1"
          max="24"
          step="any"
          value={rules.travel?.hoursPerDay ?? ''}
          {disabled}
          onchange={(e) =>
            doc.edit('travel-rules', ['travel', 'hoursPerDay'], num(e.currentTarget))}
        />
      </label>
      <label>
        <span>{t('rules.hexKm')}<InfoTip text={t('rules.hexKmHelp')} /></span>
        <input
          type="number"
          min="0.1"
          step="any"
          value={rules.travel?.hexKm ?? ''}
          {disabled}
          onchange={(e) => doc.edit('travel-rules', ['travel', 'hexKm'], num(e.currentTarget))}
        />
      </label>
      <label>
        <span>{t('rules.night')}<InfoTip text={t('rules.nightHelp')} /></span>
        <select
          value={rules.day?.night === false ? 'false' : String(rules.day?.night ?? '')}
          {disabled}
          onchange={(e) => {
            const v = e.currentTarget.value
            doc.edit(
              'travel-rules',
              ['day', 'night'],
              v === '' ? undefined : v === 'false' ? false : v,
            )
          }}
        >
          <option value="">{t('rules.nightDefault')}</option>
          <option value="false">{t('rules.nightNone')}</option>
          {#each actionIds(doc.rules) as id (id)}<option value={id}>{id}</option>{/each}
        </select>
      </label>
    </div>
  </section>

  <section>
    <h3>{t('rules.modes')}<InfoTip text={t('rules.modesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['modes']}
      idLabel={t('forms.id')}
      suggestions={['foot', 'horse', 'cart', 'boat']}
      template={{ kmPerDay: 25 }}
      columns={[
        { field: 'name', label: t('rules.name'), help: t('rules.nameHelp'), type: 'text' },
        { field: 'kmPerDay', label: t('rules.kmPerDay'), type: 'number', min: 0 },
        {
          field: 'through',
          label: t('rules.allowedTerrains'),
          help: t('rules.allowedTerrainsHelp'),
          type: 'flow',
          placeholder: t('rules.anyTerrain'),
          hints: passableHints,
          read: (row) => modeThrough(row as { allowedTerrains?: string[] }),
          replaces: ['allowedTerrains'],
        },
        {
          field: 'when',
          label: t('actions.when'),
          help: t('rules.modeWhenHelp'),
          type: 'flow',
          placeholder: t('checks.always'),
          hints: contextSuggestions(library.registry),
        },
        {
          field: 'unless',
          label: t('actions.unless'),
          help: t('rules.modeWhenHelp'),
          type: 'flow',
          placeholder: t('checks.never'),
          hints: contextSuggestions(library.registry),
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.terrains')}<InfoTip text={t('rules.terrainsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['terrains']}
      idLabel={t('rules.terrain')}
      suggestions={PALETTE}
      nameOf={terrainName}
      template={{ multiplier: 1 }}
      columns={[
        {
          field: 'multiplier',
          label: t('rules.multiplier'),
          help: t('rules.multiplierHelp'),
          type: 'number',
          min: 0,
          placeholder: '1',
        },
        {
          field: 'passable',
          label: t('rules.passable'),
          help: t('rules.passableHelp'),
          type: 'check',
          default: true,
        },
        {
          field: 'passable.when',
          label: t('rules.openWhen'),
          help: t('rules.passableWhenHelp'),
          type: 'flow',
          placeholder: t('checks.always'),
          hints: passableHints,
          off: (row) => row.passable === false,
        },
        {
          field: 'passable.unless',
          label: t('rules.closedWhen'),
          help: t('rules.passableWhenHelp'),
          type: 'flow',
          placeholder: t('checks.never'),
          hints: passableHints,
          off: (row) => row.passable === false,
        },
      ]}
    />
    <label class="single">
      <span>{t('rules.defaultTerrain')}<InfoTip text={t('rules.defaultTerrainHelp')} /></span>
      <input
        type="number"
        min="0"
        step="any"
        placeholder="1"
        value={rules.defaultTerrain?.multiplier ?? ''}
        {disabled}
        onchange={(e) => {
          const n = num(e.currentTarget)
          doc.edit(
            'travel-rules',
            ['defaultTerrain'],
            n === undefined ? undefined : { multiplier: n },
          )
        }}
      />
    </label>
  </section>

  <section>
    <h3>{t('rules.water')}<InfoTip text={t('rules.waterHelp')} /></h3>
    <div class="inline">
      <label class="check">
        <input
          type="checkbox"
          checked={rules.water?.passable !== false}
          {disabled}
          onchange={(e) =>
            (!e.currentTarget.checked || rules.water?.passable === false) &&
            doc.edit(
              'travel-rules',
              ['water', 'passable'],
              e.currentTarget.checked ? undefined : false,
            )}
        />
        {t('rules.passable')}<InfoTip text={t('rules.passableHelp')} />
      </label>
      {#if rules.water?.passable !== false}
        {#each [['when', 'rules.openWhen', 'checks.always'], ['unless', 'rules.closedWhen', 'checks.never']] as const as [key, label, empty] (key)}
          <label class="condition">
            <span>{t(label)}<InfoTip text={t('rules.passableWhenHelp')} /></span>
            <SuggestInput
              placeholder={t(empty)}
              value={conditionText(waterPassable?.[key])}
              suggestions={passableHints}
              {disabled}
              onchange={(text) => setWaterPassable(key, text)}
            />
          </label>
        {/each}
        <label>
          <span>{t('rules.multiplier')}</span>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="1"
            value={rules.water?.multiplier ?? ''}
            {disabled}
            onchange={(e) =>
              doc.edit('travel-rules', ['water', 'multiplier'], num(e.currentTarget))}
          />
        </label>
      {/if}
    </div>
  </section>

  <section>
    <h3>{t('rules.edges')}<InfoTip text={t('rules.edgesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['edges']}
      idLabel={t('rules.edge')}
      suggestions={['road', 'trail', 'river']}
      nameOf={edgeName}
      template={{ multiplier: 1.5 }}
      columns={[
        {
          field: 'multiplier',
          label: t('rules.multiplier'),
          help: t('rules.edgeMultiplierHelp'),
          type: 'number',
          min: 0,
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.resources')}<InfoTip text={t('rules.resourcesHelp')} /></h3>
    {#if olderEating.length}
      <p class="older">
        {t('rules.olderEating')}
        {#if !disabled}<button onclick={convertEating}>{t('rules.olderEatingConvert')}</button>{/if}
      </p>
    {/if}
    <RecordRows
      {doc}
      at={['resources']}
      idLabel={t('forms.id')}
      suggestions={['food', 'water', 'fodder', 'torches']}
      template={{ min: 0 }}
      columns={[
        { field: 'name', label: t('rules.name'), help: t('rules.nameHelp'), type: 'text' },
        { field: 'min', label: t('rules.min'), help: t('rules.minHelp'), type: 'number' },
        { field: 'max', label: t('rules.max'), help: t('rules.maxHelp'), type: 'number' },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.weather')}<InfoTip text={t('rules.weatherHelp')} /></h3>
    <RecordRows
      {doc}
      at={['weather']}
      idLabel={t('rules.weatherState')}
      suggestions={['rain', 'snow', 'fog', 'storm', 'blizzard', 'hot']}
      template={{ speed: 0.5 }}
      columns={[
        {
          field: 'speed',
          label: t('rules.speed'),
          help: t('rules.speedHelp'),
          type: 'number',
          min: 0,
          placeholder: '1',
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.values')}<InfoTip text={t('rules.valuesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['values']}
      idLabel={t('forms.id')}
      suggestions={['lost', 'stranded', 'exhausted']}
      template={{ blocks: ['travel'] }}
      columns={[
        { field: 'name', label: t('rules.name'), help: t('rules.nameHelp'), type: 'text' },
        { field: 'description', label: t('checks.description'), type: 'text' },
        {
          field: 'blocks',
          label: t('rules.blocks'),
          help: t('rules.blocksHelp'),
          type: 'list',
          placeholder: t('rules.blocksNothing'),
          choices: [
            ...BLOCKABLE,
            ...actionIds(doc.rules),
            ...Object.keys(doc.rules.modes ?? {}).map((m) => `mode.${m}`),
          ],
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.actions')}<InfoTip text={t('rules.actionsHelp')} /></h3>
    <ActionsForm {doc} />
  </section>
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

  .older {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .older button {
    margin-left: 6px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .inline {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label.condition {
    flex: 1;
    min-width: 14em;
  }

  label input[type='number'],
  label input[type='time'] {
    width: 130px;
  }

  .single {
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

  .single input {
    width: 90px;
  }

  label.check {
    flex-direction: row;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: var(--text);
  }
</style>
