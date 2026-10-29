<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows, { type Column } from '../forms/RecordRows.svelte'

  /**
   * A bestiary (`kind: bestiary`) as forms: its name, the sheet and `behind` its templates
   * share, and each template with its variant, values, conditions, items and token.
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const templates = $derived(Object.keys((data.templates as object | undefined) ?? {}))
  /** The sheets the system's pack has, written as `sheet.<id>`. */
  const sheets = $derived(
    (library.registry.extras.get(system.pack ?? '') ?? [])
      .filter((e) => e.kind === 'sheet')
      .map((e) => `sheet.${e.id ?? 'default'}`),
  )
  /** What the sheets of the templates declare, for the values and conditions to pick from. */
  const sheetDefs = $derived(Object.values(system.templateSheets ?? {}))
  const valueIds = $derived([...new Set(sheetDefs.flatMap((s) => Object.keys(s.values)))])
  const conditionIds = $derived([...new Set(sheetDefs.flatMap((s) => Object.keys(s.conditions)))])
  const itemIds = $derived([
    ...new Set((system.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  const columns = $derived<Column[]>([
    { field: 'name', label: t('bestiaryForm.templateName'), type: 'text' },
    {
      field: 'description',
      label: t('forms.description'),
      help: t('forms.descriptionHelp'),
      type: 'text',
    },
    {
      field: 'sheet',
      label: t('bestiaryForm.sheet'),
      help: t('bestiaryForm.templateSheetHelp'),
      type: 'select',
      choices: sheets,
      placeholder: t('bestiaryForm.sheetBestiary'),
    },
    {
      field: 'like',
      label: t('bestiaryForm.like'),
      help: t('bestiaryForm.likeHelp'),
      type: 'select',
      choices: templates,
    },
    {
      field: 'values',
      label: t('bestiaryForm.values'),
      help: t('bestiaryForm.valuesHelp'),
      type: 'pairs',
      fresh: 1,
      hints: Object.fromEntries(valueIds.map((v) => [v, []])),
    },
    {
      field: 'conditions',
      label: t('bestiaryForm.conditions'),
      help: t('bestiaryForm.conditionsHelp'),
      type: 'list',
      choices: conditionIds,
    },
    {
      field: 'items',
      label: t('bestiaryForm.items'),
      help: t('bestiaryForm.itemsHelp'),
      type: 'pairs',
      fresh: 1,
      hints: Object.fromEntries(itemIds.map((i) => [i, []])),
    },
    {
      field: 'tags',
      label: t('bestiaryForm.tags'),
      help: t('bestiaryForm.tagsHelp'),
      type: 'list',
    },
    {
      field: 'names',
      label: t('bestiaryForm.names'),
      help: t('bestiaryForm.namesHelp'),
      type: 'value',
    },
    {
      field: 'behind',
      label: t('bestiaryForm.behind'),
      help: t('bestiaryForm.behindHelp'),
      type: 'select',
      choices: ['stay', 'leave'],
      placeholder: t('bestiaryForm.behindBestiary'),
    },
    {
      field: 'token.icon',
      label: t('bestiaryForm.tokenIcon'),
      help: t('bestiaryForm.tokenIconHelp'),
      type: 'value',
    },
    {
      field: 'token.kind',
      label: t('bestiaryForm.tokenKind'),
      help: t('bestiaryForm.tokenKindHelp'),
      type: 'select',
      choices: ['pc', 'npc', 'enemy'],
    },
    {
      field: 'token.color',
      label: t('bestiaryForm.tokenColor'),
      help: t('bestiaryForm.tokenColorHelp'),
      type: 'value',
    },
  ])
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('bestiaryForm.name')}<InfoTip text={t('bestiaryForm.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label>
      <span>{t('bestiaryForm.sheet')}<InfoTip text={t('bestiaryForm.sheetHelp')} /></span>
      <select
        value={(data.sheet as string | undefined) ?? ''}
        {disabled}
        onchange={(e) => doc.edit('', ['sheet'], e.currentTarget.value || undefined)}
      >
        <option value="">—</option>
        {#each sheets as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </label>
    <label>
      <span>{t('bestiaryForm.behind')}<InfoTip text={t('bestiaryForm.behindHelp')} /></span>
      <select
        value={(data.behind as string | undefined) ?? ''}
        {disabled}
        onchange={(e) => doc.edit('', ['behind'], e.currentTarget.value || undefined)}
      >
        <option value="">{t('bestiaryForm.behindDefault')}</option>
        <option value="stay">stay</option>
        <option value="leave">leave</option>
      </select>
    </label>
  </section>

  <section>
    <h3>{t('bestiaryForm.templates')}<InfoTip text={t('bestiaryForm.templatesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['templates']}
      idLabel={t('forms.id')}
      suggestions={['wolf', 'bandit', 'guard', 'skeleton', 'goblin']}
      template={{}}
      {columns}
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
