<script lang="ts" module>
  export interface Column {
    field: string
    label: string
    help?: string
    /** number: a number box (empty = not set); check: a checkbox; list: comma-separated; flow: `key: value` pairs. */
    type: 'number' | 'check' | 'list' | 'flow'
    placeholder?: string
    /** For checks, the value meant when the field is missing. */
    default?: boolean
    min?: number
  }
</script>

<script lang="ts">
  import { confirmAction, InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
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
  }: {
    doc: SystemDoc
    kind?: Kind
    at: string[]
    columns: Column[]
    suggestions?: string[]
    nameOf?: (id: string) => string
    template?: Record<string, unknown>
    idLabel: string
  } = $props()

  const record = $derived.by(() => {
    let node: unknown = kind === 'bindings' ? doc.bindings : doc.rules
    for (const part of at) node = (node as Record<string, unknown> | undefined)?.[part]
    return (typeof node === 'object' && node !== null ? node : {}) as Record<
      string,
      Record<string, unknown> | null
    >
  })
  const rows = $derived(Object.entries(record))
  const free = $derived(suggestions.filter((s) => !(s in record)))
  const listId = $props.id()
  const disabled = $derived(!doc.editable)

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (to in record) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename(kind, at, id, to)
  }

  function set(id: string, column: Column, input: HTMLInputElement) {
    const path = [...at, id, column.field]
    if (column.type === 'check') {
      const on = input.checked
      return doc.edit(kind, path, on === column.default ? undefined : on)
    }
    const text = input.value.trim()
    if (column.type === 'number')
      return doc.edit(kind, path, text === '' ? undefined : Number(text))
    if (column.type === 'list') {
      const items = text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return doc.edit(kind, path, items.length ? items : undefined)
    }
    const value = parseFlow(text)
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    doc.edit(kind, path, value)
  }

  function shown(row: Record<string, unknown> | null, column: Column): string {
    const value = row?.[column.field]
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

<table class="rows" class:compact={columns.every((c) => c.type === 'number' || c.type === 'check')}>
  {#if rows.length}<thead>
      <tr>
        <th>{idLabel}</th>
        {#each columns as c (c.field)}
          <th
            >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</th
          >
        {/each}
        <th></th>
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
                checked={(row?.[c.field] as boolean | undefined) ?? c.default ?? false}
                {disabled}
                onchange={(e) => set(id, c, e.currentTarget)}
              />
            {:else}
              <input
                type={c.type === 'number' ? 'number' : 'text'}
                aria-label={c.label}
                min={c.min}
                step="any"
                placeholder={c.placeholder}
                value={shown(row, c)}
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
  .rows {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .rows.compact {
    width: auto;
  }

  .compact .id {
    width: 360px;
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

  td input[type='text'],
  td input[type='number'] {
    width: 100%;
    min-width: 0;
  }

  td input[type='checkbox'] {
    margin-top: 8px;
  }

  .id {
    width: 34%;
  }

  .idcell {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .idcell input {
    flex: 1;
  }

  .idcell small {
    flex: none;
    width: 40%;
    overflow: hidden;
    font-size: 12px;
    color: var(--text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  td.number {
    width: 110px;
  }

  td.check {
    width: 80px;
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
