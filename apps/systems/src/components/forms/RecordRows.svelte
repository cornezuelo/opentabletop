<script lang="ts" module>
  import type { Snippet } from 'svelte'

  export interface Column {
    /** The row's key, or a key inside one (`passable.when`). */
    field: string
    label: string
    help?: string
    /**
     * number: a number box (empty = not set); check: a checkbox; list: words as pills;
     * flow: `key: value` pairs; text: what players read, in the UI's language (written to
     * the translation file when it isn't the pack's); select: one of `choices` (or none);
     * value: a number, or a word or a variable (`'{{self.values.maxHealth}}'`) as it's written;
     * condition: a condition as rows (`hints`: what it reads); pairs: a map as rows of
     * `key · value` (`hints`: the keys, each with its values); custom: an editor of the
     * form's own (`render`), said in a folded card by `said`.
     */
    type:
      | 'number'
      | 'check'
      | 'list'
      | 'flow'
      | 'text'
      | 'select'
      | 'value'
      | 'condition'
      | 'pairs'
      | 'custom'
    /** A list's separator as it's typed: commas, or spaces for words with commas (`15,9`). */
    separator?: 'comma' | 'space'
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
    /** For pairs, a new row's value. */
    fresh?: string | number | boolean
    /** For custom: the editor, given the row's id, the field's value and how to write it. */
    render?: Snippet<[CustomField]>
    /** For custom: the field in a folded card's line (empty: not said). */
    said?: (value: unknown, id: string) => string
  }

  /** What a custom column's editor gets. */
  export interface CustomField {
    id: string
    value: unknown
    disabled: boolean
    set: (value: unknown) => void
  }

  /** Columns too big for a table's cell: rows with one are shown as cards. */
  const BIG: readonly Column['type'][] = ['condition', 'pairs', 'flow', 'custom']

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
  import { CardHead, CardTools } from '@open-tabletop/pack-ui'
  import { SvelteSet } from 'svelte/reactivity'
  import {
    confirmAction,
    InfoTip,
    showToast,
    SuggestInput,
    TagInput,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { ConditionEditor, conditionWords, PairEditor } from '@open-tabletop/pack-ui'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { getLocale, t } from '../../lib/i18n'
  import { matches } from '../../lib/search'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import type { RowsDoc } from '../../lib/partDoc.svelte'
  import type { TravelSystem, Use } from '@open-tabletop/session'
  import UsedBy from '../uses/UsedBy.svelte'
  import UsesList from '../uses/UsesList.svelte'

  /**
   * A map of the rules keyed by id (terrains, modes, weather…), each entry its id, one
   * field per column and a button to remove it. Short entries are rows of a table; entries
   * with conditions, maps or many fields are folded cards (like actions and checks), their
   * fields in two columns, with a search when there are many.
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
    uses,
    cards: asCards,
    ordered,
  }: {
    doc: RowsDoc
    kind?: string
    at: string[]
    columns: Column[]
    suggestions?: string[]
    nameOf?: (id: string) => string
    template?: Record<string, unknown>
    idLabel: string
    /** Keys of the record that aren't rows (e.g. camp and rest among the actions). */
    exclude?: string[]
    /** Where each row's id is used in the system's packs: a "Used by" column. */
    uses?: { of: (id: string) => Use[]; system: TravelSystem }
    /** Cards or a table; by default cards when a column is big or there are many. */
    cards?: boolean
    /**
     * Where order decides something (the first way of travelling is a new trip's, factions
     * take their turns in order): its cards show their place and can be moved (drag ⠿, ↑ ↓).
     * Its name tells its drags from other lists'.
     */
    ordered?: string
  } = $props()

  const cards = $derived(
    asCards ?? (columns.some((c) => BIG.includes(c.type)) || columns.length > 4),
  )
  /** The cards shown unfolded (folded by default). */
  const unfolded = new SvelteSet<string>()
  let query = $state('')
  const locale = $derived(getLocale())
  const nameColumn = $derived(columns.find((c) => c.field === 'name' && c.type === 'text'))
  const title = (id: string, row: Record<string, unknown> | null) =>
    (nameColumn && shown(row, nameColumn, id)) || nameOf(id)
  /** A card in one line, folded: each field that says something, but its texts. */
  const summary = (row: Record<string, unknown> | null, id = '') =>
    columns
      .filter((c) => c.type !== 'text')
      .flatMap((c) => {
        const value = valueAt(row, c.field)
        if (c.type === 'custom') {
          const said = c.said?.(value, id)
          return said ? [`${c.label}: ${said}`] : []
        }
        if (value === undefined || value === null || value === '') return []
        if (c.type === 'check') {
          // A field that holds more than a tick (a map of conditions) counts as ticked.
          const on = value !== false
          return on === (c.default ?? false)
            ? []
            : [`${c.label}: ${t(on ? 'forms.yes' : 'forms.no')}`]
        }
        if (c.type === 'condition') return [`${c.label}: ${conditionWords(value, locale)}`]
        return [`${c.label}: ${shown(row, c)}`]
      })
      .join(' · ')

  /** The row whose uses are shown below it. */
  let usesOpen = $state<string | null>(null)

  const record = $derived.by(() => {
    let node: unknown = doc.data(kind)
    for (const part of at) node = (node as Record<string, unknown> | undefined)?.[part]
    return (typeof node === 'object' && node !== null ? node : {}) as Record<
      string,
      Record<string, unknown> | null
    >
  })
  const rows = $derived(Object.entries(record).filter(([id]) => !exclude.includes(id)))
  const visible = $derived(
    rows.filter(([id, row]) =>
      matches(query, [id, title(id, row), nameOf(id), summary(row, id), row]),
    ),
  )
  const free = $derived(suggestions.filter((s) => !(s in record)))
  const listId = $props.id()
  const disabled = $derived(!doc.editable)

  /** Moves a row to where another one is (by their places among the rows). */
  function moveTo(from: number, to: number) {
    if (!ordered || to < 0 || to >= rows.length) return
    doc.moveKey(kind, at, rows[from][0], Object.keys(record).indexOf(rows[to][0]))
  }
  const placeOf = (id: string) => rows.findIndex(([r]) => r === id)

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (to in record) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename(kind, at, id, to)
    if (unfolded.delete(id)) unfolded.add(to)
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
    const path = [...at, id, ...column.field.split('.')]
    for (const old of column.replaces ?? [])
      if (record[id]?.[old] !== undefined) doc.edit(kind, [...at, id, old], undefined)
    const text = raw.trim()
    if (column.type === 'text')
      return doc.setText(kind, path, valueAt(record[id], column.field), path, raw)
    if (column.type === 'number')
      return write(id, column.field, text === '' ? undefined : Number(text))
    // A value written as a map (`{ sum: items.slots }`) is read as one.
    if (column.type === 'value' && !text.startsWith('{'))
      return write(
        id,
        column.field,
        text === '' ? undefined : /^[+-]?\d+(\.\d+)?$/.test(text) ? Number(text) : text,
      )
    const value = parseFlow(text)
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    write(id, column.field, value)
  }

  function setList(id: string, column: Column, ids: string[]) {
    // Items written with more than their id (`{ id: hostile, name: Hostile }`) keep it.
    const before = valueAt(record[id], column.field)
    const kept = Array.isArray(before) ? before : []
    const items = ids.map((item) => kept.find((k) => itemId(k) === item) ?? item)
    write(id, column.field, items.length ? items : undefined)
  }

  /** A list column's items by id (one written alone is a list of one). */
  function listOf(row: Record<string, unknown> | null, column: Column): string[] {
    const value = valueAt(row, column.field) ?? (row && column.read?.(row))
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value.map(itemId) : [String(value)]
  }

  /** An item of a list: itself, or its id when it's written with more (`{ id: d6, name: … }`). */
  const itemId = (item: unknown): string =>
    typeof item === 'object' && item !== null && 'id' in item ? String(item.id) : String(item)

  function shown(row: Record<string, unknown> | null, column: Column, id = ''): string {
    const value = valueAt(row, column.field) ?? (row && column.read?.(row))
    if (column.type === 'text')
      return doc.text(kind, value, [...at, id, ...column.field.split('.')])
    if (value === undefined) return ''
    if (column.type === 'list')
      return Array.isArray(value) ? value.map(itemId).join(', ') : String(value)
    if (column.type === 'flow' || column.type === 'pairs')
      return flowText(value).replace(/^\{\s*|\s*\}$/g, '')
    if (column.type === 'value' && typeof value === 'object' && value !== null)
      return flowText(value)
    return String(value)
  }

  function add() {
    const id = free[0] ?? freeId('new', Object.keys(record))
    doc.edit(kind, [...at, id], { ...template })
    query = ''
    unfolded.add(id)
  }

  async function remove(id: string) {
    if (await confirmAction(t('forms.confirmRemove', { name: nameOf(id) })))
      doc.edit(kind, [...at, id], undefined)
  }
</script>

{#snippet idBox(id: string)}
  <input
    type="text"
    value={id}
    list={listId}
    {disabled}
    aria-label={idLabel}
    onchange={(e) => rename(id, e.currentTarget.value)}
  />
{/snippet}

{#snippet control(id: string, row: Record<string, unknown> | null, c: Column)}
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
  {:else if c.type === 'condition'}
    <ConditionEditor
      value={valueAt(row, c.field)}
      suggestions={c.hints}
      {locale}
      disabled={disabled || (!!row && !!c.off?.(row))}
      label={c.label}
      onchange={(v) => write(id, c.field, v)}
    />
  {:else if c.type === 'pairs'}
    <PairEditor
      value={valueAt(row, c.field)}
      keys={Object.keys(c.hints ?? {})}
      values={c.hints}
      fresh={c.fresh}
      {locale}
      disabled={disabled || (!!row && !!c.off?.(row))}
      label={c.label}
      onchange={(v) => write(id, c.field, v)}
    />
  {:else if c.type === 'custom'}
    {@render c.render?.({
      id,
      value: valueAt(row, c.field),
      disabled: disabled || (!!row && !!c.off?.(row)),
      set: (v) => write(id, c.field, v),
    })}
  {:else if c.type === 'select'}
    <select
      aria-label={c.label}
      value={shown(row, c)}
      {disabled}
      onchange={(e) => write(id, c.field, e.currentTarget.value || undefined)}
    >
      <option value="">{c.placeholder ?? ''}</option>
      {#each c.choices ?? [] as choice (choice)}<option value={choice}>{choice}</option>{/each}
    </select>
  {:else if c.type === 'list'}
    <TagInput
      label={c.label}
      placeholder={c.placeholder}
      value={listOf(row, c)}
      choices={c.choices}
      removeLabel={t('forms.removeItem')}
      separator={c.separator}
      disabled={disabled || (!!row && !!c.off?.(row))}
      onchange={(items) => setList(id, c, items)}
    />
  {:else if c.type === 'flow' && c.hints}
    <SuggestInput
      label={c.label}
      placeholder={c.placeholder}
      value={shown(row, c)}
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
        ? doc.baseText(valueAt(row, c.field)) || c.placeholder
        : c.placeholder}
      value={shown(row, c, id)}
      {disabled}
      onchange={(e) => set(id, c, e.currentTarget)}
    />
  {/if}
{/snippet}

{#snippet removeButton(id: string)}
  {#if !disabled}
    <button
      class="icon"
      aria-label={t('forms.remove')}
      use:tooltip={t('forms.remove')}
      onclick={() => remove(id)}>×</button
    >
  {/if}
{/snippet}

{#if cards}
  <div class="cards">
    {#if rows.length > 5}
      <CardTools
        locale={getLocale()}
        bind:query
        shown={visible.length}
        total={rows.length}
        label={t('forms.search')}
        onopenall={() => visible.forEach(([id]) => unfolded.add(id))}
        oncloseall={() => unfolded.clear()}
      />
    {/if}
    {#each visible as [id, row] (id)}
      {@const open = unfolded.has(id)}
      <div class="card">
        <CardHead
          locale={getLocale()}
          title={title(id, row)}
          {id}
          said={open ? undefined : summary(row, id)}
          {open}
          ontoggle={() => (open ? unfolded.delete(id) : unfolded.add(id))}
          {disabled}
          order={ordered
            ? {
                index: placeOf(id),
                count: rows.length,
                list: ordered,
                onmove: (by) => moveTo(placeOf(id), placeOf(id) + by),
                ondrop: (from) => moveTo(from, placeOf(id)),
              }
            : undefined}
        >
          {@render removeButton(id)}
        </CardHead>
        {#if open}
          <div class="fields">
            <label class="field">
              <span>{idLabel}</span>
              {@render idBox(id)}
            </label>
            {#each columns as c (c.field)}
              {#if c.type === 'check'}
                <label class="field inline">
                  {@render control(id, row, c)}
                  <span
                    >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</span
                  >
                </label>
              {:else if c.type === 'custom'}
                <div class="field wide-field">
                  <span
                    >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</span
                  >
                  {@render control(id, row, c)}
                </div>
              {:else if c.type === 'condition' || c.type === 'pairs'}
                <div class="field">
                  <span
                    >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</span
                  >
                  {@render control(id, row, c)}
                </div>
              {:else}
                <label class="field">
                  <span
                    >{c.label}{#if c.help}<InfoTip text={c.help} />{/if}</span
                  >
                  {@render control(id, row, c)}
                </label>
              {/if}
            {/each}
            {#if uses}
              <div class="field used">
                <span>{t('uses.title')}<InfoTip text={t('uses.help')} /></span>
                <UsedBy
                  uses={uses.of(id)}
                  open={usesOpen === id}
                  ontoggle={() => (usesOpen = usesOpen === id ? null : id)}
                />
              </div>
              {#if usesOpen === id}
                <div class="wide-field"><UsesList uses={uses.of(id)} system={uses.system} /></div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{:else}
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
          {#if uses}<th class="uses">{t('uses.title')}<InfoTip text={t('uses.help')} /></th>{/if}
          <th class="remove"></th>
        </tr>
      </thead>{/if}
    <tbody>
      {#each rows as [id, row] (id)}
        <tr>
          <td class="id">
            <div class="idcell">
              {@render idBox(id)}
              {#if nameOf(id) !== id}<small>{nameOf(id)}</small>{/if}
            </div>
          </td>
          {#each columns as c (c.field)}
            <td class={c.type}>
              {@render control(id, row, c)}
            </td>
          {/each}
          {#if uses}
            <td class="uses">
              <UsedBy
                uses={uses.of(id)}
                open={usesOpen === id}
                ontoggle={() => (usesOpen = usesOpen === id ? null : id)}
              />
            </td>
          {/if}
          <td class="remove">
            {@render removeButton(id)}
          </td>
        </tr>
        {#if uses && usesOpen === id}
          <tr class="uses-row">
            <td colspan={columns.length + 3}
              ><UsesList uses={uses.of(id)} system={uses.system} /></td
            >
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
{/if}
<datalist id={listId}>
  {#each free as s (s)}<option value={s}>{nameOf(s)}</option>{/each}
</datalist>
{#if !disabled}
  <button class="add" onclick={add}>{t('forms.add')}</button>
{/if}

<style>
  .cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 820px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  /* The same two columns as actions' and checks' cards. */
  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px 16px;
    align-items: start;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input[type='text'],
  .field input[type='number'],
  .field select {
    width: 100%;
    min-width: 0;
  }

  .field.inline {
    flex-direction: row;
    align-self: end;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }

  .field.used {
    align-items: flex-start;
  }

  .wide-field {
    grid-column: 1 / -1;
  }

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

  .wide .number,
  .wide .value {
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
  .wide td input[type='number'],
  .wide td select {
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

  .rows:not(.wide) td.value input {
    width: 8em;
  }

  td.check,
  th.check {
    text-align: center;
  }

  .remove {
    width: 32px;
  }

  .wide .uses {
    width: 5em;
  }

  .uses-row td {
    padding: 2px 4px 8px 12px;
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
