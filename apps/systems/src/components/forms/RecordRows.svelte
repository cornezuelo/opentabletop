<script lang="ts" module>
  export interface Column {
    /** The row's key, or a key inside one (`passable.when`). */
    field: string
    label: string
    help?: string
    /**
     * number: a number box (empty = not set); check: a checkbox; list: comma-separated;
     * flow: `key: value` pairs; text: what players read, in the UI's language (written to
     * the translation file when it isn't the pack's).
     */
    type: 'number' | 'check' | 'list' | 'flow' | 'text'
    placeholder?: string
    /** For checks, the value meant when the field is missing. */
    default?: boolean
    min?: number
    /** Known values: for a list, its choices; for flow, the keys (each with its values). */
    choices?: readonly string[]
    hints?: Record<string, readonly string[]>
    /** Shows the field from older forms when it's missing (e.g. a list read as a condition). */
    read?: (row: Record<string, unknown>) => unknown
    /** Older fields this one replaces: removed when it's written. */
    replaces?: string[]
    /** Off in rows where this holds (e.g. a terrain's conditions while it's never passable). */
    off?: (row: Record<string, unknown>) => boolean
  }

  /** A row's value at a column's field, which may be a key inside one (`passable.when`). */
  export function valueAt(row: Record<string, unknown> | null, field: string): unknown {
    let node: unknown = row
    for (const key of field.split('.'))
      node =
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined
    return node
  }
</script>

<script lang="ts">
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { t } from '../../lib/i18n'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import type { Kind, SystemDoc } from '../../lib/systemDoc.svelte'

  /**
   * A map of the rules keyed by id (terrains, modes, resources…) as rows: the id, one
   * box per field, and a button to remove it.
   */
  let {
    doc,
    kind = 'travel-rules',
    at,
    columns,
    suggestions = [],
    nameOf = (id: string) => id,
    template = {},
    idLabel,
    exclude = [],
  }: {
    doc: SystemDoc
    kind?: Kind
    at: string[]
    columns: Column[]
    suggestions?: string[]
    nameOf?: (id: string) => string
    template?: Record<string, unknown>
    idLabel: string
    /** Keys of the record that aren't rows (e.g. camp and rest among the actions). */
    exclude?: string[]
  } = $props()

  const record = $derived.by(() => {
    let node: unknown = kind === 'bindings' ? doc.bindings : doc.rules
    for (const part of at) node = (node as Record<string, unknown> | undefined)?.[part]
    return (typeof node === 'object' && node !== null ? node : {}) as Record<
      string,
      Record<string, unknown> | null
    >
  })
  const rows = $derived(Object.entries(record).filter(([id]) => !exclude.includes(id)))
  const free = $derived(suggestions.filter((s) => !(s in record)))
  const listId = $props.id()
  const disabled = $derived(!doc.editable)

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (to in record) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename(kind, at, id, to)
  }

  /**
   * Writes a column's value. A key inside another (`passable.when`) rewrites its parent:
   * made a map if it wasn't one, removed when nothing is left in it.
   */
  function write(id: string, field: string, value: unknown) {
    const [parent, key] = field.split('.')
    if (key === undefined) return doc.edit(kind, [...at, id, field], value)
    const current = record[id]?.[parent]
    const next = {
      ...(typeof current === 'object' && current !== null ? current : {}),
      [key]: value,
    } as Record<string, unknown>
    if (value === undefined) delete next[key]
    doc.edit(kind, [...at, id, parent], Object.keys(next).length ? next : undefined)
  }

  function set(id: string, column: Column, input: HTMLInputElement) {
    if (column.type === 'check') {
      const on = input.checked
      // Ticking a check whose field holds more (a map of conditions) keeps it.
      if (on && typeof record[id]?.[column.field] === 'object') return
      return write(id, column.field, on === column.default ? undefined : on)
    }
    setText(id, column, input.value)
  }

  function setText(id: string, column: Column, raw: string) {
    const path = [...at, id, column.field]
    for (const old of column.replaces ?? [])
      if (record[id]?.[old] !== undefined) doc.edit(kind, [...at, id, old], undefined)
    const text = raw.trim()
    if (column.type === 'text')
      return doc.setText(kind, path, record[id]?.[column.field], path, raw)
    if (column.type === 'number')
      return write(id, column.field, text === '' ? undefined : Number(text))
    if (column.type === 'list') {
      const items = text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return write(id, column.field, items.length ? items : undefined)
    }
    const value = parseFlow(text)
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    write(id, column.field, value)
  }

  function shown(row: Record<string, unknown> | null, column: Column, id = ''): string {
    const value = valueAt(row, column.field) ?? (row && column.read?.(row))
    if (column.type === 'text') return doc.text(kind, value, [...at, id, column.field])
    if (value === undefined) return ''
    if (column.type === 'list') return Array.isArray(value) ? value.join(', ') : String(value)
    if (column.type === 'flow') return flowText(value).replace(/^\{\s*|\s*\}$/g, '')
    return String(value)
  }

  function add() {
    const id = free[0] ?? freeId('new', Object.keys(record))
    doc.edit(kind, [...at, id], { ...template })
  }
</script>

<table
  class="rows"
  class:wide={columns.some((c) => c.type === 'flow')}
  class:named={rows.some(([id]) => nameOf(id) !== id)}
>
  {#if rows.length}<thead>
      <tr>
        <th class="id">{idLabel}</th>
        {#each columns as c (c.field)}
          <th class={c.type}
            >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</th
          >
        {/each}
        <th class="remove"></th>
      </tr>
    </thead>{/if}
  <tbody>
    {#each rows as [id, row] (id)}
      <tr>
        <td class="id">
          <div class="idcell">
            <input
              type="text"
              value={id}
              list={listId}
              {disabled}
              aria-label={idLabel}
              onchange={(e) => rename(id, e.currentTarget.value)}
            />
            {#if nameOf(id) !== id}<small>{nameOf(id)}</small>{/if}
          </div>
        </td>
        {#each columns as c (c.field)}
          <td class={c.type}>
            {#if c.type === 'check'}
              <input
                type="checkbox"
                aria-label={c.label}
                checked={valueAt(row, c.field) === undefined
                  ? (c.default ?? false)
                  : valueAt(row, c.field) !== false}
                disabled={disabled || (!!row && !!c.off?.(row))}
                onchange={(e) => set(id, c, e.currentTarget)}
              />
            {:else if (c.type === 'list' && c.choices) || (c.type === 'flow' && c.hints)}
              <SuggestInput
                label={c.label}
                placeholder={c.placeholder}
                value={shown(row, c)}
                list={c.type === 'list' ? c.choices : undefined}
                suggestions={c.hints}
                disabled={disabled || (!!row && !!c.off?.(row))}
                onchange={(text) => setText(id, c, text)}
              />
            {:else}
              <input
                type={c.type === 'number' ? 'number' : 'text'}
                aria-label={c.label}
                min={c.min}
                step="any"
                placeholder={c.type === 'text' && doc.translating
                  ? doc.baseText(row?.[c.field]) || c.placeholder
                  : c.placeholder}
                value={shown(row, c, id)}
                {disabled}
                onchange={(e) => set(id, c, e.currentTarget)}
              />
            {/if}
          </td>
        {/each}
        <td class="remove">
          {#if !disabled}
            <button
              class="icon"
              aria-label={t('forms.remove')}
              use:tooltip={t('forms.remove')}
              onclick={async () =>
                (await confirmAction(t('forms.confirmRemove', { name: nameOf(id) }))) &&
                doc.edit(kind, [...at, id], undefined)}>×</button
            >
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
<datalist id={listId}>
  {#each free as s (s)}<option value={s}>{nameOf(s)}</option>{/each}
</datalist>
{#if !disabled}
  <button class="add" onclick={add}>{t('forms.add')}</button>
{/if}

<style>
  /* As wide as its columns; only rows with conditions take the whole width. */
  .rows {
    align-self: flex-start;
    border-collapse: collapse;
    font-size: 13px;
  }

  .rows.wide {
    align-self: stretch;
    width: 100%;
    table-layout: fixed;
  }

  /* Fixed columns stay narrow so conditions get the rest. */
  .wide .id {
    width: 9em;
  }

  /* Ids shown with their name beside them (terrains) need room for both. */
  .wide.named .id {
    width: 19.5em;
  }

  .wide .text {
    width: 10em;
  }

  .wide .number {
    width: 5.5em;
  }

  .wide .check {
    width: 6em;
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

  /* In rows with conditions boxes share the width; elsewhere each has its own. */
  .wide td input[type='text'],
  .wide td input[type='number'] {
    width: 100%;
    min-width: 0;
  }

  td input[type='checkbox'] {
    margin-top: 8px;
  }

  .idcell {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .idcell input[type='text'] {
    flex: none;
    width: 11em;
  }

  .wide .idcell input[type='text'] {
    flex: 1;
    width: auto;
  }

  .idcell small {
    flex: none;
    width: 8em;
    overflow: hidden;
    font-size: 12px;
    color: var(--text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rows:not(.wide) td.text input,
  .rows:not(.wide) td.list input {
    width: 14em;
  }

  .rows:not(.wide) td.number input {
    width: 6em;
  }

  td.check,
  th.check {
    text-align: center;
  }

  .remove {
    width: 32px;
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
