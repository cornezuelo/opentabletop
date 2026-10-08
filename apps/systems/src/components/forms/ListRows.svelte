<script lang="ts" module>
  export interface ListColumn {
    field: string
    label: string
    help?: string
    /**
     * text: what players read, in the UI's language (written to the translation file when
     * it isn't the pack's); number: a number box; select: one of `choices` (or none);
     * suggest: free text with `choices` suggested.
     */
    type: 'text' | 'number' | 'select' | 'suggest'
    choices?: readonly string[]
    placeholder?: string
    min?: number
  }
</script>

<script lang="ts">
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { t } from '../../lib/i18n'
  import type { ListDoc } from '../../lib/partDoc.svelte'

  /**
   * A list of a definition whose items have an `id` (a calendar's months, weekdays, moons,
   * holidays) as rows in order: the id, one box per field, arrows to move it and a button
   * to remove it. Translations are keyed by the id, so renaming one carries them along.
   */
  let {
    doc,
    kind = '',
    at,
    columns,
    template = {},
    idBase = 'new',
    idLabel,
    onrename,
  }: {
    doc: ListDoc
    kind?: string
    at: string[]
    columns: ListColumn[]
    /** A new item's fields besides its id. */
    template?: Record<string, unknown>
    idBase?: string
    idLabel: string
    /** Renames an item when what names it must follow (false: the id is taken). */
    onrename?: (index: number, to: string) => boolean
  } = $props()

  type Item = Record<string, unknown>
  const items = $derived.by(() => {
    let node: unknown = doc.data(kind)
    for (const part of at) node = (node as Record<string, unknown> | undefined)?.[part]
    return (Array.isArray(node) ? node : []) as Item[]
  })
  const ids = $derived(items.map((item) => String(item?.id ?? '')))
  const disabled = $derived(!doc.editable)

  function rename(i: number, next: string) {
    const from = ids[i]
    const to = next.trim()
    if (!to || to === from) return
    if (ids.includes(to)) return showToast(t('forms.idExists', { id: to }), 'error')
    if (onrename) return void onrename(i, to)
    doc.edit(kind, [...at, i, 'id'], to)
    if (from) doc.renameTranslations(kind, at, from, to)
  }

  function set(i: number, column: ListColumn, raw: string) {
    const text = raw.trim()
    const path = [...at, i, column.field]
    if (column.type === 'text')
      return doc.setText(kind, path, items[i]?.[column.field], [...at, ids[i], column.field], raw)
    if (column.type === 'number')
      return doc.edit(kind, path, text === '' ? undefined : Number(text))
    doc.edit(kind, path, text || undefined)
  }

  function shown(i: number, column: ListColumn): string {
    const value = items[i]?.[column.field]
    if (column.type === 'text') return doc.text(kind, value, [...at, ids[i], column.field])
    return value === undefined || value === null ? '' : String(value)
  }

  function add() {
    doc.insert(kind, at, items.length, { id: freeId(idBase, ids), ...template })
  }

  async function remove(i: number) {
    if (await confirmAction(t('forms.confirmRemove', { name: ids[i] || String(i + 1) })))
      doc.remove(kind, at, i)
  }
</script>

{#if items.length}
  <table class="rows">
    <thead>
      <tr>
        <th>{idLabel}</th>
        {#each columns as c (c.field)}
          <th
            >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</th
          >
        {/each}
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each items as item, i (`${i}/${String(item?.id)}`)}
        <tr>
          <td>
            <input
              class="id"
              type="text"
              value={ids[i]}
              aria-label={idLabel}
              {disabled}
              onchange={(e) => rename(i, e.currentTarget.value)}
            />
          </td>
          {#each columns as c (c.field)}
            <td class={c.type}>
              {#if c.type === 'select'}
                <select
                  aria-label={c.label}
                  value={shown(i, c)}
                  {disabled}
                  onchange={(e) => set(i, c, e.currentTarget.value)}
                >
                  <option value="">{c.placeholder ?? ''}</option>
                  {#each c.choices ?? [] as choice (choice)}<option value={choice}>{choice}</option
                    >{/each}
                </select>
              {:else if c.type === 'suggest'}
                <SuggestInput
                  label={c.label}
                  placeholder={c.placeholder}
                  value={shown(i, c)}
                  list={c.choices}
                  {disabled}
                  onchange={(text) => set(i, c, text)}
                />
              {:else}
                <input
                  type={c.type === 'number' ? 'number' : 'text'}
                  aria-label={c.label}
                  min={c.min}
                  step="any"
                  placeholder={c.type === 'text' && doc.translating
                    ? doc.baseText(item?.[c.field]) || c.placeholder
                    : c.placeholder}
                  value={shown(i, c)}
                  {disabled}
                  onchange={(e) => set(i, c, e.currentTarget.value)}
                />
              {/if}
            </td>
          {/each}
          <td class="tools">
            {#if !disabled}
              <button
                class="icon"
                aria-label={t('forms.moveUp')}
                use:tooltip={t('forms.moveUp')}
                disabled={i === 0}
                onclick={() => doc.move(kind, at, i, i - 1)}>↑</button
              >
              <button
                class="icon"
                aria-label={t('forms.moveDown')}
                use:tooltip={t('forms.moveDown')}
                disabled={i === items.length - 1}
                onclick={() => doc.move(kind, at, i, i + 1)}>↓</button
              >
              <button
                class="icon"
                aria-label={t('forms.remove')}
                use:tooltip={t('forms.remove')}
                onclick={() => remove(i)}>×</button
              >
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
{#if !disabled}
  <button class="add" onclick={add}>{t('forms.add')}</button>
{/if}

<style>
  .rows {
    align-self: flex-start;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 0 4px 4px;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 2px 4px;
    vertical-align: top;
  }

  input.id {
    width: 10em;
  }

  td.text input,
  td.suggest :global(input) {
    width: 13em;
  }

  td.number input {
    width: 6em;
  }

  .tools {
    white-space: nowrap;
  }

  .icon {
    height: 30px;
  }

  .add {
    align-self: flex-start;
    padding: 4px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
