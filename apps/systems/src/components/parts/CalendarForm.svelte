<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { renameMonth } from '../../lib/calendar'
  import ListRows from '../forms/ListRows.svelte'

  /**
   * A calendar (`kind: calendar`) as forms: its name, the year it starts in, the length
   * of the day and its watches, its months (with their seasons), weekdays, moons and
   * holidays. Trips and the world clock name time with it.
   */
  let { doc }: { doc: PartDoc } = $props()

  type Item = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const list = (key: string) => (Array.isArray(data[key]) ? (data[key] as Item[]) : [])
  const months = $derived(list('months').map((m) => String(m?.id ?? '')))
  /** The seasons its months use, after the usual four. */
  const seasons = $derived([
    ...new Set([
      'spring',
      'summer',
      'autumn',
      'winter',
      ...list('months').flatMap((m) => (typeof m?.season === 'string' ? [m.season] : [])),
    ]),
  ])
  const start = $derived((data.start ?? {}) as Item)
  const yearDays = $derived(list('months').reduce((sum, m) => sum + (Number(m?.days) || 0), 0))

  const num = (input: HTMLInputElement) =>
    input.value.trim() === '' ? undefined : Number(input.value)
  function setStart(key: 'month' | 'day', value: unknown) {
    const next: Item = { ...start, [key]: value }
    if (value === undefined) delete next[key]
    doc.edit('', ['start'], next.month ? next : undefined)
  }
</script>

<div class="form">
  <section>
    <div class="inline">
      <label class="wide">
        <span>{t('calendar.name')}<InfoTip text={t('calendar.nameHelp')} /></span>
        <input
          type="text"
          value={doc.text('', data.name, ['name'])}
          placeholder={doc.translating ? doc.baseText(data.name) : ''}
          {disabled}
          onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
        />
      </label>
      <label>
        <span>{t('calendar.startYear')}<InfoTip text={t('calendar.startYearHelp')} /></span>
        <input
          type="number"
          step="1"
          value={data.startYear ?? ''}
          placeholder="1"
          {disabled}
          onchange={(e) => doc.edit('', ['startYear'], num(e.currentTarget))}
        />
      </label>
      <label>
        <span>{t('calendar.startMonth')}<InfoTip text={t('calendar.startHelp')} /></span>
        <select
          value={String(start.month ?? '')}
          {disabled}
          onchange={(e) => setStart('month', e.currentTarget.value || undefined)}
        >
          <option value="">{t('calendar.firstMonth')}</option>
          {#each months as id (id)}<option value={id}>{id}</option>{/each}
        </select>
      </label>
      <label>
        <span>{t('calendar.startDay')}</span>
        <input
          type="number"
          min="1"
          step="1"
          value={start.day ?? ''}
          placeholder="1"
          disabled={disabled || !start.month}
          onchange={(e) => setStart('day', num(e.currentTarget))}
        />
      </label>
    </div>
    <div class="inline">
      <label>
        <span>{t('calendar.hoursPerDay')}<InfoTip text={t('calendar.hoursPerDayHelp')} /></span>
        <input
          type="number"
          min="1"
          step="any"
          value={data.hoursPerDay ?? ''}
          placeholder="24"
          {disabled}
          onchange={(e) => doc.edit('', ['hoursPerDay'], num(e.currentTarget))}
        />
      </label>
      <label>
        <span>{t('calendar.watchHours')}<InfoTip text={t('calendar.watchHoursHelp')} /></span>
        <input
          type="number"
          min="1"
          step="any"
          value={data.watchHours ?? ''}
          {disabled}
          onchange={(e) => doc.edit('', ['watchHours'], num(e.currentTarget))}
        />
      </label>
      <label>
        <span>{t('calendar.dawn')}<InfoTip text={t('calendar.dawnHelp')} /></span>
        <input
          type="time"
          value={data.dawn ?? ''}
          {disabled}
          onchange={(e) => doc.edit('', ['dawn'], e.currentTarget.value || undefined)}
        />
      </label>
      <label>
        <span>{t('calendar.dusk')}</span>
        <input
          type="time"
          value={data.dusk ?? ''}
          {disabled}
          onchange={(e) => doc.edit('', ['dusk'], e.currentTarget.value || undefined)}
        />
      </label>
    </div>
  </section>

  <section>
    <h3>{t('calendar.months')}<InfoTip text={t('calendar.monthsHelp')} /></h3>
    <ListRows
      {doc}
      at={['months']}
      onrename={(i, to) => renameMonth(doc, i, to)}
      idLabel={t('forms.id')}
      idBase="month"
      template={{ name: 'New month', days: 30 }}
      columns={[
        { field: 'name', label: t('calendar.itemName'), type: 'text' },
        { field: 'days', label: t('calendar.days'), type: 'number', min: 1 },
        {
          field: 'season',
          label: t('calendar.season'),
          help: t('calendar.seasonHelp'),
          type: 'suggest',
          choices: seasons,
        },
      ]}
    />
    <p class="help">{t('calendar.yearDays', { days: yearDays })}</p>
  </section>

  <section>
    <h3>{t('calendar.weekdays')}<InfoTip text={t('calendar.weekdaysHelp')} /></h3>
    <ListRows
      {doc}
      at={['weekdays']}
      idLabel={t('forms.id')}
      idBase="day"
      template={{ name: 'New day' }}
      columns={[{ field: 'name', label: t('calendar.itemName'), type: 'text' }]}
    />
  </section>

  <section>
    <h3>{t('calendar.moons')}<InfoTip text={t('calendar.moonsHelp')} /></h3>
    <ListRows
      {doc}
      at={['moons']}
      idLabel={t('forms.id')}
      idBase="moon"
      template={{ name: 'The moon', cycle: 28 }}
      columns={[
        { field: 'name', label: t('calendar.itemName'), type: 'text' },
        {
          field: 'cycle',
          label: t('calendar.cycle'),
          help: t('calendar.cycleHelp'),
          type: 'number',
          min: 1,
        },
        {
          field: 'offset',
          label: t('calendar.offset'),
          help: t('calendar.offsetHelp'),
          type: 'number',
          min: 0,
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('calendar.holidays')}<InfoTip text={t('calendar.holidaysHelp')} /></h3>
    <ListRows
      {doc}
      at={['holidays']}
      idLabel={t('forms.id')}
      idBase="holiday"
      template={{ name: 'New holiday', month: months[0] ?? '', day: 1 }}
      columns={[
        { field: 'name', label: t('calendar.itemName'), type: 'text' },
        { field: 'month', label: t('calendar.month'), type: 'select', choices: months },
        { field: 'day', label: t('calendar.day'), type: 'number', min: 1 },
      ]}
    />
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

  label.wide input {
    width: 20em;
  }

  label input[type='number'],
  label input[type='time'] {
    width: 130px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
