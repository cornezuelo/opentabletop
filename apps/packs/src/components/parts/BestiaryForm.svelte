<script lang="ts">
  import type { TemplateDef } from '@open-tabletop/character-engine'
  import { roster, TemplateEditor } from '@open-tabletop/character-ui'
  import { tagsInUse, type TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { bestiaryOf, shownTemplate, writeTemplate } from '../../lib/bestiary'
  import { getLocale, t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows, { type Column } from '../forms/RecordRows.svelte'

  /**
   * A bestiary (`kind: bestiary`) as forms: its name, the sheet and `behind` its templates
   * share, and each template as a folded card unfolding to its whole editor (character-ui's
   * `TemplateEditor`, the one place templates are edited): the sheet it's made with, its
   * values, conditions, tags, items, variant, names and token. `item`: a template asked for
   * in the link, unfolded.
   */
  let { doc, system, id, item }: { doc: PartDoc; system: TravelSystem; id: string; item?: string } =
    $props()

  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const templates = $derived(Object.keys((data.templates as object | undefined) ?? {}))
  /** The sheets the system's pack has, written as `sheet.<id>`. */
  const sheets = $derived(
    (library.registry.extras.get(system.pack ?? '') ?? [])
      .filter((e) => e.kind === 'sheet')
      .map((e) => `sheet.${e.id ?? 'default'}`),
  )
  const itemIds = $derived([
    ...new Set((system.items ?? []).flatMap((c) => Object.keys(c.def.items))),
  ])
  /** The bestiary as the system read it: each template's sheet, resolved. */
  const read = $derived(bestiaryOf(system, { root: doc.root, id }))
  const sheetOf = (template: string) => system.templateSheets?.[read?.sheets[template] ?? '']
  const tagChoices = $derived(tagsInUse(system, roster.roster))
  /** What a folded card says and the search finds; an unfolded card is the template's editor. */
  const columns = $derived<Column[]>([
    { field: 'name', label: t('bestiaryForm.templateName'), type: 'text' },
    { field: 'sheet', label: t('bestiaryForm.sheet'), type: 'select' },
    { field: 'like', label: t('bestiaryForm.like'), type: 'select' },
    { field: 'values', label: t('bestiaryForm.values'), type: 'pairs' },
    { field: 'conditions', label: t('bestiaryForm.conditions'), type: 'list' },
    { field: 'items', label: t('bestiaryForm.items'), type: 'pairs' },
    { field: 'tags', label: t('bestiaryForm.tags'), type: 'list' },
    { field: 'names', label: t('bestiaryForm.names'), type: 'value' },
    { field: 'behind', label: t('bestiaryForm.behind'), type: 'select' },
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
      cards
      unfold={item ? [item] : []}
    >
      {#snippet body({ id: template, row, disabled: off })}
        {@const raw = (row ?? {}) as TemplateDef}
        {@const shown = shownTemplate(doc, template, raw)}
        {@const sheet = sheetOf(template)}
        <div class="template">
          <label class="sheet">
            <span
              >{t('bestiaryForm.sheet')}<InfoTip text={t('bestiaryForm.templateSheetHelp')} /></span
            >
            <select
              value={raw.sheet ?? ''}
              disabled={off}
              onchange={(e) =>
                doc.edit('', ['templates', template, 'sheet'], e.currentTarget.value || undefined)}
            >
              <option value="">{t('bestiaryForm.sheetBestiary')}</option>
              {#each sheets as s (s)}<option value={s}>{s}</option>{/each}
            </select>
          </label>
          {#if sheet}
            <TemplateEditor
              id={template}
              {sheet}
              template={shown}
              locale={getLocale()}
              disabled={off}
              others={templates.filter((x) => x !== template)}
              items={itemIds}
              {tagChoices}
              onchange={(next) => writeTemplate(doc, template, raw, shown, next)}
            />
          {:else}
            <p class="help">{t('bestiaryForm.noSheet')}</p>
          {/if}
        </div>
      {/snippet}
    </RecordRows>
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

  .template {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sheet {
    max-width: 260px;
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
