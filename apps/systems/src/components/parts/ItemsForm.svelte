<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows, { type Column } from '../forms/RecordRows.svelte'
  import { sheetText } from '@open-tabletop/character-ui'
  import { getLocale } from '../../lib/i18n'

  /**
   * An item catalogue (`kind: items`) as forms: its name, and each item with its texts,
   * tags, where it fits, what it holds and a number for each field the system's sheet gives
   * items.
   */
  let { doc, system }: { doc: PartDoc; system: TravelSystem } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  /** The fields the sheet gives every item: one column each. */
  const fields = $derived(Object.entries(system.sheet?.def.items?.fields ?? {}))
  /** What a place is, for where an item fits: the sheet's places' tags. */
  const placeTags = $derived([
    ...new Set(Object.values(system.sheet?.def.items?.places ?? {}).flatMap((p) => p.tags ?? [])),
  ])
  const columns = $derived<Column[]>([
    { field: 'name', label: t('itemsForm.itemName'), type: 'text' },
    {
      field: 'description',
      label: t('forms.description'),
      help: t('forms.descriptionHelp'),
      type: 'text',
    },
    { field: 'tags', label: t('itemsForm.tags'), help: t('itemsForm.tagsHelp'), type: 'list' },
    ...fields.map(([id, f]): Column => ({
      field: id,
      label: sheetText(f.name, getLocale()) ?? id,
      type: 'number',
      ...(f.default !== undefined && { placeholder: String(f.default) }),
    })),
    {
      field: 'fits',
      label: t('itemsForm.fits'),
      help: t('itemsForm.fitsHelp'),
      type: 'condition',
      hints: { 'place.tags': placeTags, 'place.id': [] },
    },
    {
      field: 'holds.room',
      label: t('itemsForm.holdsRoom'),
      help: t('itemsForm.holdsRoomHelp'),
      type: 'number',
      min: 0,
    },
    {
      field: 'holds.tags',
      label: t('itemsForm.holdsTags'),
      help: t('itemsForm.holdsTagsHelp'),
      type: 'list',
      choices: placeTags,
    },
  ])
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('itemsForm.name')}<InfoTip text={t('itemsForm.nameHelp')} /></span>
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
    <h3>{t('itemsForm.items')}<InfoTip text={t('itemsForm.itemsHelp')} /></h3>
    {#if !fields.length}<p class="help">{t('itemsForm.noFields')}</p>{/if}
    <RecordRows
      {doc}
      at={['items']}
      idLabel={t('forms.id')}
      suggestions={['rope', 'torch', 'ration', 'backpack', 'lantern', 'shield']}
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

  .help {
    margin: 0;
    color: var(--text-muted);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
