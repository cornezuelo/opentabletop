<script lang="ts">
  import { localize, type TravelSystem } from '@open-tabletop/session'
  import { CLOCK_THEN, clockFullMoment, reactionsAt } from '@open-tabletop/world-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'
  import { go } from '../../lib/nav.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { addClockReaction } from '../../lib/newSystem'
  import { usesFor } from '../../lib/usage'
  import RecordRows, { type CustomField } from '../forms/RecordRows.svelte'

  /**
   * The progress clocks of a system (`kind: clocks`) as forms: each clock's name, its
   * segments and where it starts, what becomes of it once full (it stays full, starts over
   * or goes), and the world's reactions to its filling (in the World tab).
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  /** The world's reactions to a clock filling, by their names. */
  const reactionsOn = (clock: string) =>
    reactionsAt(system.world?.def, clockFullMoment(clock)).map(
      (id) => localize(system.world?.def.reactions[id].name, getLocale(), system.locale) ?? id,
    )
  const showWorld = () => go({ name: 'system', id: system.id, tab: 'world' })
  function addReaction(clock: string) {
    if (addClockReaction(system, clock)) showWorld()
  }
</script>

{#snippet whenFull(field: CustomField)}
  <div class="full">
    {#if reactionsOn(field.id).length}
      <button class="link" onclick={showWorld}>{reactionsOn(field.id).join(', ')}</button>
    {:else}
      <span class="muted">{t('clocksForm.nothingWhenFull')}</span>
    {/if}
    {#if !field.disabled}
      <button class="add" onclick={() => addReaction(field.id)}
        >{t('clocksForm.addWhenFull')}</button
      >
    {/if}
  </div>
{/snippet}

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
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
        {
          field: 'then',
          label: t('clocksForm.then'),
          help: t('clocksForm.thenHelp'),
          type: 'select',
          choices: CLOCK_THEN,
          placeholder: t('clocksForm.keepByDefault'),
        },
        {
          field: 'whenFull',
          label: t('clocksForm.whenFull'),
          help: t('clocksForm.whenFullHelp'),
          type: 'custom',
          render: whenFull,
          said: (_, id) => reactionsOn(id).join(', '),
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

  .full {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  .muted {
    color: var(--text-muted);
  }

  .add {
    padding: 3px 10px;
    font-size: 12px;
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
