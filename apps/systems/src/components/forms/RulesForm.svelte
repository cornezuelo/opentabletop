<script lang="ts">
  import { InfoTip, showToast, SuggestInput } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { t } from '../../lib/i18n'
  import { actionIds, type SystemDoc } from '../../lib/systemDoc.svelte'
  import { edgeName, terrainName, PALETTE } from '../../lib/terrains'
  import { contextSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { dayPartRefs } from '../../lib/dayParts'
  import { BLOCKABLE, ref, refId } from '@open-tabletop/travel-engine'
  import { library } from '../../lib/packs.svelte'
  import ActionsForm from './ActionsForm.svelte'
  import RecordRows from './RecordRows.svelte'
  import { usesFor } from '../../lib/usage'

  /** Travel rules as forms: the day, terrains, roads, modes, supplies, weather and actions. */
  let { doc, system }: { doc: SystemDoc; system?: TravelSystem } = $props()
  /** The parts of its calendar's day: the day may start and end at one. */
  const parts = $derived(dayPartRefs(system))

  const rules = $derived(doc.rules as Record<string, Record<string, unknown> | undefined>)
  const disabled = $derived(!doc.editable)

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

  /** The halt (`travel.halt`): from when, and which action; without an action, none. */
  const halt = $derived(rules.travel?.halt as { at?: string; do?: string } | undefined)
  function setHalt(key: 'at' | 'do', value: string) {
    const next = { at: halt?.at ?? '20:00', do: halt?.do ?? '', [key]: value }
    doc.edit('travel-rules', ['travel', 'halt'], next.do && next.at ? next : undefined)
  }

  /** How the trip goes on by itself (`travel.onward`): an action and its parameters. */
  const onward = $derived(
    rules.travel?.onward as { do?: string; with?: Record<string, unknown> } | undefined,
  )
  function setOnward(key: 'do' | 'with', value: unknown) {
    const next = { ...onward, [key]: value }
    if (next.with === undefined) delete next.with
    doc.edit('travel-rules', ['travel', 'onward'], next.do ? next : undefined)
  }
  function setOnwardWith(text: string) {
    const value = text.trim() ? parseFlow(text) : undefined
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    setOnward('with', value && Object.keys(value).length ? value : undefined)
  }
  /** What the way on can be taken with: its action's parameters and their choices. */
  const onwardHints = $derived.by(() => {
    const actions = (doc.rules.actions ?? {}) as Record<string, { params?: unknown }>
    const params = (actions[refId('actions', onward?.do) ?? '']?.params ?? {}) as Record<
      string,
      { choices?: unknown[] }
    >
    return Object.fromEntries(
      Object.entries(params).map(([key, p]) => [
        key,
        (p.choices ?? []).map((c) =>
          String(typeof c === 'object' && c !== null ? (c as { id: unknown }).id : c),
        ),
      ]),
    )
  })

  const num = (input: HTMLInputElement) =>
    input.value.trim() === '' ? undefined : Number(input.value)
</script>

<div class="form">
  <section>
    <h3>{t('rules.day')}<InfoTip text={t('rules.dayHelp')} /></h3>
    <div class="inline">
      <label>
        <span>{t('rules.tripStart')}<InfoTip text={t('rules.tripStartHelp')} /></span>
        <SuggestInput
          label={t('rules.tripStart')}
          value={String(rules.travel?.start ?? '')}
          list={['06:00', ...parts]}
          {disabled}
          onchange={(v) => doc.edit('travel-rules', ['travel', 'start'], v.trim() || undefined)}
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
    </div>
    <div class="inline">
      <label>
        <span>{t('rules.haltAt')}<InfoTip text={t('rules.haltHelp')} /></span>
        <SuggestInput
          label={t('rules.haltAt')}
          value={String(halt?.at ?? '')}
          list={['20:00', ...parts]}
          {disabled}
          onchange={(v) => setHalt('at', v.trim())}
        />
      </label>
      <label>
        <span>{t('rules.haltDo')}</span>
        <select
          value={String(halt?.do ?? '')}
          {disabled}
          onchange={(e) => setHalt('do', e.currentTarget.value)}
        >
          <option value="">{t('rules.haltNone')}</option>
          {#each actionIds(doc.rules) as id (id)}<option value={ref('actions', id)}>{id}</option
            >{/each}
        </select>
      </label>
    </div>
    <div class="inline">
      <label>
        <span>{t('rules.onwardDo')}<InfoTip text={t('rules.onwardHelp')} /></span>
        <select
          value={String(onward?.do ?? '')}
          {disabled}
          onchange={(e) => setOnward('do', e.currentTarget.value || undefined)}
        >
          <option value="">{t('rules.onwardNone')}</option>
          {#each actionIds(doc.rules) as id (id)}<option value={ref('actions', id)}>{id}</option
            >{/each}
        </select>
      </label>
      {#if onward?.do}
        <label>
          <span>{t('rules.onwardWith')}<InfoTip text={t('rules.onwardWithHelp')} /></span>
          <SuggestInput
            label={t('rules.onwardWith')}
            value={conditionText(onward.with)}
            suggestions={onwardHints}
            {disabled}
            onchange={(v) => setOnwardWith(v)}
          />
        </label>
      {/if}
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
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        { field: 'kmPerDay', label: t('rules.kmPerDay'), type: 'number', min: 0 },
        {
          field: 'through',
          label: t('rules.allowedTerrains'),
          help: t('rules.allowedTerrainsHelp'),
          type: 'flow',
          placeholder: t('rules.anyTerrain'),
          hints: passableHints,
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
    <RecordRows
      {doc}
      at={['resources']}
      uses={system && { of: (id) => usesFor(system, { kind: 'supply', id }), system }}
      idLabel={t('forms.id')}
      suggestions={['food', 'water', 'fodder', 'torches']}
      template={{ min: 0 }}
      columns={[
        { field: 'name', label: t('rules.name'), help: t('rules.nameHelp'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
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
      uses={system && { of: (id) => usesFor(system, { kind: 'day-value', id }), system }}
      idLabel={t('forms.id')}
      suggestions={['lost', 'stranded', 'exhausted']}
      template={{ blocks: ['travel.move'] }}
      columns={[
        { field: 'name', label: t('rules.name'), help: t('rules.nameHelp'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'blocks',
          label: t('rules.blocks'),
          help: t('rules.blocksHelp'),
          type: 'list',
          placeholder: t('rules.blocksNothing'),
          choices: [
            ...BLOCKABLE,
            ...actionIds(doc.rules).map((a) => ref('actions', a)),
            ...Object.keys(doc.rules.modes ?? {}).map((m) => ref('modes', m)),
          ],
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('rules.actions')}<InfoTip text={t('rules.actionsHelp')} /></h3>
    <ActionsForm {doc} {system} />
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
