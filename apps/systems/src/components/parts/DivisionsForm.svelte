<script lang="ts">
  import { confirmAction, InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { RESERVED_DIVISIONS } from '@open-tabletop/time'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import ListRows from '../forms/ListRows.svelte'

  /**
   * A calendar's divisions of the day (`divisions:`), as many as the system wants: each one
   * its id (how conditions read it, `time.<id>`), its name, and its parts as rows (id, name,
   * from, until, tags) or numbered parts of equal length (`every` hours).
   */
  let { doc }: { doc: PartDoc } = $props()

  type Item = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const divisions = $derived(
    typeof data.divisions === 'object' && data.divisions !== null
      ? Object.entries(data.divisions as Record<string, Item>)
      : [],
  )
  const ids = $derived(divisions.map(([id]) => id))
  const num = (input: HTMLInputElement) =>
    input.value.trim() === '' ? undefined : Number(input.value)

  function add() {
    const id = freeId('division', ids)
    doc.edit('', ['divisions', id], { parts: [{ id: 'morning', from: '06:00' }] })
  }

  function rename(from: string, raw: string) {
    const to = raw.trim()
    if (!to || to === from) return
    if (ids.includes(to)) return showToast(t('forms.idExists', { id: to }), 'error')
    if ((RESERVED_DIVISIONS as readonly string[]).includes(to))
      return showToast(t('calendar.divisionReserved', { id: to }), 'error')
    doc.rename('', ['divisions'], from, to)
  }

  async function remove(id: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: id })))) return
    const rest = Object.fromEntries(divisions.filter(([other]) => other !== id))
    doc.edit('', ['divisions'], Object.keys(rest).length ? rest : undefined)
  }

  /** Parts of their own, or numbered ones every N hours. */
  function setShape(id: string, division: Item, numbered: boolean) {
    const next: Item = { ...division }
    if (numbered) {
      delete next.parts
      next.every = 4
    } else {
      delete next.every
      next.parts = [{ id: 'morning', from: '06:00' }]
    }
    doc.edit('', ['divisions', id], next)
  }
</script>

<section>
  <h3>{t('calendar.divisions')}<InfoTip text={t('calendar.divisionsHelp')} /></h3>
  {#each divisions as [id, division] (id)}
    {@const numbered = division?.every !== undefined}
    <div class="division">
      <div class="inline">
        <label>
          <span>{t('forms.id')}<InfoTip text={t('calendar.divisionIdHelp')} /></span>
          <input
            type="text"
            value={id}
            {disabled}
            onchange={(e) => rename(id, e.currentTarget.value)}
          />
        </label>
        <label class="wide">
          <span>{t('calendar.itemName')}</span>
          <input
            type="text"
            value={doc.text('', division?.name, ['divisions', id, 'name'])}
            placeholder={doc.translating ? doc.baseText(division?.name) : ''}
            {disabled}
            onchange={(e) =>
              doc.setText(
                '',
                ['divisions', id, 'name'],
                division?.name,
                ['divisions', id, 'name'],
                e.currentTarget.value,
              )}
          />
        </label>
        <label>
          <span
            >{t('calendar.divisionShape')}<InfoTip text={t('calendar.divisionShapeHelp')} /></span
          >
          <select
            value={numbered ? 'every' : 'parts'}
            {disabled}
            onchange={(e) => setShape(id, division, e.currentTarget.value === 'every')}
          >
            <option value="parts">{t('calendar.shapeParts')}</option>
            <option value="every">{t('calendar.shapeEvery')}</option>
          </select>
        </label>
        {#if numbered}
          <label>
            <span>{t('calendar.every')}</span>
            <input
              type="number"
              min="0.25"
              step="any"
              value={division.every ?? ''}
              {disabled}
              onchange={(e) => doc.edit('', ['divisions', id, 'every'], num(e.currentTarget))}
            />
          </label>
        {/if}
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => remove(id)}>×</button
          >
        {/if}
      </div>
      {#if !numbered}
        <ListRows
          {doc}
          at={['divisions', id, 'parts']}
          idLabel={t('forms.id')}
          idBase="part"
          template={{ from: '12:00' }}
          columns={[
            { field: 'name', label: t('calendar.itemName'), type: 'text' },
            {
              field: 'from',
              label: t('calendar.partFrom'),
              help: t('calendar.partFromHelp'),
              type: 'time',
            },
            {
              field: 'until',
              label: t('calendar.partUntil'),
              help: t('calendar.partUntilHelp'),
              type: 'time',
            },
            {
              field: 'tags',
              label: t('calendar.partTags'),
              help: t('calendar.partTagsHelp'),
              type: 'words',
            },
          ]}
        />
      {/if}
    </div>
  {/each}
  {#if !disabled}
    <button class="add" onclick={add}>{t('calendar.addDivision')}</button>
  {/if}
</section>

<style>
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

  .division {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
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
    width: 16em;
  }

  label input[type='number'] {
    width: 100px;
  }

  .add {
    align-self: flex-start;
  }
</style>
