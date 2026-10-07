<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { SystemDoc } from '../../lib/systemDoc.svelte'
  import { edgeName, terrainName, PALETTE } from '../../lib/terrains'
  import RecordRows from './RecordRows.svelte'

  /** Travel rules as forms: the day, terrains, roads, modes, supplies, weather and actions. */
  let { doc }: { doc: SystemDoc } = $props()

  const rules = $derived(doc.rules as Record<string, Record<string, unknown> | undefined>)
  const disabled = $derived(!doc.editable)
  const resources = $derived(Object.keys(rules.resources ?? {}))
  const actions = $derived((rules.actions ?? {}) as Record<string, unknown>)
  const rest = $derived(actions.rest)

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
        { field: 'kmPerDay', label: t('rules.kmPerDay'), type: 'number', min: 0 },
        {
          field: 'consumes',
          label: t('rules.consumes'),
          help: t('rules.consumesHelp'),
          type: 'flow',
          placeholder: resources[1] ? `${resources[1]}: 1` : 'fodder: 1',
        },
        {
          field: 'allowedTerrains',
          label: t('rules.allowedTerrains'),
          help: t('rules.allowedTerrainsHelp'),
          type: 'list',
          placeholder: t('rules.anyTerrain'),
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
            doc.edit(
              'travel-rules',
              ['water', 'passable'],
              e.currentTarget.checked ? undefined : false,
            )}
        />
        {t('rules.passable')}<InfoTip text={t('rules.passableHelp')} />
      </label>
      {#if rules.water?.passable !== false}
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
      idLabel={t('forms.id')}
      suggestions={['food', 'water', 'fodder', 'torches']}
      template={{ perDay: 1 }}
      columns={[
        {
          field: 'perDay',
          label: t('rules.perDay'),
          help: t('rules.perDayHelp'),
          type: 'number',
          min: 0,
          placeholder: '0',
        },
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
    <h3>{t('rules.actions')}<InfoTip text={t('rules.actionsHelp')} /></h3>
    <label class="check">
      <input
        type="checkbox"
        checked={actions.camp !== false}
        {disabled}
        onchange={(e) =>
          doc.edit(
            'travel-rules',
            ['actions', 'camp'],
            e.currentTarget.checked ? undefined : false,
          )}
      />
      {t('rules.camp')}<InfoTip text={t('rules.campHelp')} />
    </label>
    <div class="inline">
      <label class="check">
        <input
          type="checkbox"
          checked={rest !== false}
          {disabled}
          onchange={(e) =>
            doc.edit(
              'travel-rules',
              ['actions', 'rest'],
              e.currentTarget.checked ? undefined : false,
            )}
        />
        {t('rules.rest')}<InfoTip text={t('rules.restHelp')} />
      </label>
      {#if rest !== false}
        {@const r = (rest ?? {}) as Record<string, unknown>}
        <label>
          <span>{t('rules.restMinutes')}</span>
          <input
            type="number"
            min="1"
            placeholder="60"
            value={r.minutes ?? ''}
            {disabled}
            onchange={(e) =>
              doc.edit('travel-rules', ['actions', 'rest', 'minutes'], num(e.currentTarget))}
          />
        </label>
        <label>
          <span>{t('rules.restFatigue')}<InfoTip text={t('rules.restFatigueHelp')} /></span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={r.fatigue ?? ''}
            {disabled}
            onchange={(e) =>
              doc.edit('travel-rules', ['actions', 'rest', 'fatigue'], num(e.currentTarget))}
          />
        </label>
      {/if}
    </div>
    <h4>{t('rules.ownActions')}<InfoTip text={t('rules.ownActionsHelp')} /></h4>
    <RecordRows
      {doc}
      at={['actions']}
      exclude={['camp', 'rest']}
      idLabel={t('forms.id')}
      suggestions={['forage', 'hunt', 'scout', 'pray']}
      template={{ minutes: 60 }}
      columns={[
        {
          field: 'minutes',
          label: t('rules.restMinutes'),
          type: 'number',
          min: 0,
          placeholder: '0',
        },
        {
          field: 'speed',
          label: t('rules.speed'),
          help: t('rules.actionSpeedHelp'),
          type: 'number',
          min: 0,
          placeholder: '1',
        },
        {
          field: 'fatigue',
          label: t('rules.restFatigue'),
          type: 'number',
          min: 0,
          placeholder: '0',
        },
        { field: 'oncePerDay', label: t('rules.oncePerDay'), type: 'check', default: false },
      ]}
    />
  </section>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 820px;
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
