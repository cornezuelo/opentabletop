<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { availableActions, MARCH } from '@open-tabletop/travel-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows from '../forms/RecordRows.svelte'

  /**
   * A sheet (`kind: sheet`) as forms: what each of the party's characters has. Its values
   * (with their bounds, as tracks, in groups), its conditions (and what each blocks) and
   * the kinds of relation a character may hold.
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  /** What a condition may block: travel, the system's actions and its ways of travelling. */
  const blockable = $derived([
    'travel',
    ...Object.keys(availableActions(system.rules).all).filter((id) => id !== MARCH),
    ...Object.keys(system.rules.modes).map((id) => `mode.${id}`),
  ])
</script>

<div class="form">
  <section>
    <label class="name">
      <span>{t('sheet.name')}<InfoTip text={t('sheet.nameHelp')} /></span>
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
    <h3>{t('sheet.values')}<InfoTip text={t('sheet.valuesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['values']}
      idLabel={t('forms.id')}
      template={{ default: 0 }}
      columns={[
        { field: 'name', label: t('sheet.valueName'), type: 'text' },
        {
          field: 'default',
          label: t('sheet.default'),
          help: t('sheet.defaultHelp'),
          type: 'number',
        },
        {
          field: 'min',
          label: t('sheet.min'),
          help: t('sheet.boundHelp'),
          type: 'value',
        },
        { field: 'max', label: t('sheet.max'), help: t('sheet.boundHelp'), type: 'value' },
        { field: 'track', label: t('sheet.track'), help: t('sheet.trackHelp'), type: 'check' },
        { field: 'group', label: t('sheet.group'), help: t('sheet.groupHelp'), type: 'value' },
      ]}
    />
  </section>

  <section>
    <h3>{t('sheet.groups')}<InfoTip text={t('sheet.groupsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['groups']}
      idLabel={t('forms.id')}
      suggestions={['attributes', 'skills', 'body', 'gear']}
      columns={[{ field: 'name', label: t('sheet.groupName'), type: 'text' }]}
    />
  </section>

  <section>
    <h3>{t('sheet.conditions')}<InfoTip text={t('sheet.conditionsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['conditions']}
      idLabel={t('forms.id')}
      suggestions={['wounded', 'exhausted', 'hungry', 'frightened']}
      columns={[
        { field: 'name', label: t('sheet.conditionName'), type: 'text' },
        {
          field: 'blocks',
          label: t('sheet.blocks'),
          help: t('sheet.blocksHelp'),
          type: 'list',
          choices: blockable,
        },
      ]}
    />
  </section>

  <section>
    <h3>{t('sheet.relations')}<InfoTip text={t('sheet.relationsHelp')} /></h3>
    <RecordRows
      {doc}
      at={['relations']}
      idLabel={t('forms.id')}
      suggestions={['bond', 'rival', 'home', 'debt', 'oath']}
      columns={[
        { field: 'name', label: t('sheet.relationName'), type: 'text' },
        {
          field: 'value.min',
          label: t('sheet.relationMin'),
          help: t('sheet.relationValueHelp'),
          type: 'number',
        },
        {
          field: 'value.max',
          label: t('sheet.relationMax'),
          help: t('sheet.relationValueHelp'),
          type: 'number',
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

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 320px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
