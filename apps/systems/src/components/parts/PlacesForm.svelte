<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows, { type Column } from '../forms/RecordRows.svelte'

  /**
   * A catalogue of places (`kind: places`) as forms: its name, and each place with its texts,
   * its icon, the tags it gives its hex and its fields.
   */
  let { doc }: { doc: PartDoc } = $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const columns: Column[] = [
    { field: 'name', label: t('placesForm.placeName'), type: 'text' },
    {
      field: 'description',
      label: t('forms.description'),
      help: t('placesForm.descriptionHelp'),
      type: 'text',
    },
    {
      field: 'icon',
      label: t('placesForm.icon'),
      help: t('placesForm.iconHelp'),
      type: 'value',
      placeholder: 'game:castle-ruins',
    },
    { field: 'tags', label: t('placesForm.tags'), help: t('placesForm.tagsHelp'), type: 'list' },
    {
      field: 'fields',
      label: t('placesForm.fields'),
      help: t('placesForm.fieldsHelp'),
      type: 'flow',
    },
  ]
</script>

<div class="form">
  <section class="head">
    <label>
      <span>{t('placesForm.name')}<InfoTip text={t('placesForm.nameHelp')} /></span>
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
    <h3>{t('placesForm.places')}<InfoTip text={t('placesForm.placesHelp')} /></h3>
    <RecordRows
      {doc}
      at={['places']}
      idLabel={t('forms.id')}
      suggestions={['ruins', 'shrine', 'camp', 'cave', 'tower', 'landmark']}
      template={{ name: 'New place' }}
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
