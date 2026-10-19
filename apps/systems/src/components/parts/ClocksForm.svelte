<script lang="ts">
  import { effectSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { CLOCK_THEN } from '@open-tabletop/world-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { usesFor } from '../../lib/usage'
  import RecordRows from '../forms/RecordRows.svelte'

  /**
   * The progress clocks of a system (`kind: clocks`) as forms: each clock's name, its
   * segments and where it starts, and what happens when it fills (its words, a table
   * rolled, effects on the world, and whether it then stays full, starts over or goes).
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  /** What its effects can change: the world's clocks and the factions. */
  const effects = $derived(
    Object.fromEntries(
      Object.entries(effectSuggestions(library.registry)).filter(([path]) =>
        /^(world\.clocks|factions)\./.test(path),
      ),
    ),
  )
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('clocksForm.name')}<InfoTip text={t('clocksForm.nameHelp')} /></span>
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
    <h3>{t('clocksForm.clocks')}<InfoTip text={t('clocksForm.clocksHelp')} /></h3>
    <RecordRows
      {doc}
      at={['clocks']}
      idLabel={t('forms.id')}
      uses={{ of: (id) => usesFor(system, { kind: 'clock', id }), system }}
      template={{ segments: 6 }}
      columns={[
        { field: 'name', label: t('clocksForm.clockName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'segments',
          label: t('clocksForm.segments'),
          help: t('clocksForm.segmentsHelp'),
          type: 'number',
          min: 1,
        },
        {
          field: 'filled',
          label: t('clocksForm.filled'),
          help: t('clocksForm.filledHelp'),
          type: 'number',
          min: 0,
          placeholder: '0',
        },
        {
          field: 'onFull.description',
          label: t('clocksForm.description'),
          help: t('clocksForm.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'onFull.resolve',
          label: t('clocksForm.resolve'),
          help: t('clocksForm.resolveHelp'),
          type: 'value',
          placeholder: 'core/table.twists',
        },
        {
          field: 'onFull.effects',
          label: t('clocksForm.effects'),
          help: t('clocksForm.effectsHelp'),
          type: 'flow',
          hints: effects,
        },
        {
          field: 'onFull.then',
          label: t('clocksForm.then'),
          help: t('clocksForm.thenHelp'),
          type: 'select',
          choices: CLOCK_THEN,
          placeholder: t('clocksForm.keepByDefault'),
        },
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

  .head {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
