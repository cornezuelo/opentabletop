<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { insertIn, moveIn, removeIn, setIn } from '@open-tabletop/pack-ui/yaml'
  import { t } from '../../lib/i18n'
  import { getAt, nextId, type DefinitionDoc, type Path } from '../../lib/packs/doc.svelte'
  import RefPicker from './RefPicker.svelte'

  interface RawEntry {
    id?: string
    range?: string | number
    weight?: number
    result?: string
    table?: string
    generator?: string
    when?: unknown
    set?: unknown
    once?: boolean
    maxOccurrences?: number
  }

  /**
   * A list of entries (a table's, or one oracle variant's). With dice they have ranges;
   * without, weights. `rollPath` is where "Number 1–N" writes the matching dice.
   */
  let { doc, path, rollPath }: { doc: DefinitionDoc; path: Path; rollPath: Path } = $props()

  const id = $derived(doc.def.localId)
  const entries = $derived((getAt(doc.raw, path) as RawEntry[] | undefined) ?? [])
  const roll = $derived(getAt(doc.raw, rollPath) ?? doc.raw.roll)
  const hasRoll = $derived(typeof roll === 'string' && roll.trim() !== '')
  const missingIds = $derived(entries.some((e) => !e.id))

  /** Columns sized to what they hold (in characters); the text column takes the rest. */
  const fit = (values: unknown[], min: number, max: number) =>
    `${Math.min(max, Math.max(min, ...values.map((v) => String(v ?? '').length))) + 3}ch`
  const widths = $derived.by(() => {
    const refs = entries.map((e) => e.table ?? e.generator)
    return {
      id: fit(
        entries.map((e) => e.id),
        3,
        20,
      ),
      num: fit(
        entries.map((e) => (hasRoll ? e.range : e.weight)),
        2,
        8,
      ),
      then: refs.some(Boolean) ? `calc(100px + ${fit(refs, 6, 26)})` : '110px',
    }
  })

  const edit = (i: number, key: string, value: unknown) => doc.edit([...path, i, key], value)
  const asRange = (v: string) => (/^\s*-?\d+\s*$/.test(v) ? Number(v) : v.trim())

  function setTarget(i: number, kind: 'table' | 'generator' | '', target: string) {
    let text = setIn(doc.content, id, [...path, i, 'table'], undefined)
    text = setIn(text, id, [...path, i, 'generator'], undefined)
    if (kind && target) text = setIn(text, id, [...path, i, kind], target)
    doc.save(text)
  }

  function add(at = entries.length) {
    // New entries get an id when the others have them, so they can be translated.
    const ids = entries.some((e) => e.id) ? { id: nextId(entries.map((e) => e.id)) } : {}
    const next = hasRoll
      ? { ...ids, range: entries.length + 1, result: '' }
      : { ...ids, result: '' }
    doc.save(insertIn(doc.content, id, path, at, next))
  }

  function duplicate(i: number) {
    const copy: RawEntry = { ...entries[i] }
    if (copy.id) copy.id = nextId(entries.map((e) => e.id))
    doc.save(insertIn(doc.content, id, path, i + 1, copy))
  }

  function renumber() {
    let text = doc.content
    entries.forEach((e, i) => {
      text = setIn(text, id, [...path, i, 'range'], i + 1)
      if (e.weight !== undefined) text = setIn(text, id, [...path, i, 'weight'], undefined)
    })
    doc.save(setIn(text, id, rollPath, `1d${entries.length}`))
  }

  function assignIds() {
    const used: (string | undefined)[] = entries.map((e) => e.id)
    let text = doc.content
    entries.forEach((e, i) => {
      if (e.id) return
      const next = nextId(used)
      used.push(next)
      text = setIn(text, id, [...path, i, 'id'], next)
    })
    doc.save(text)
  }

  const advanced = (e: RawEntry) =>
    e.when !== undefined || e.set !== undefined || e.once || e.maxOccurrences !== undefined

  /** Rows showing their conditions, values and limits. */
  let open = $state<Record<number, boolean>>({})
  /** Rows whose condition or values box holds text that isn't key: value pairs. */
  let invalid = $state<Record<string, boolean>>({})

  /** A condition or `set` typed as one line: saved when it reads as a map, flagged if not. */
  function editFlow(i: number, key: 'when' | 'set', text: string) {
    const value = parseFlow(text)
    invalid = { ...invalid, [`${i}.${key}`]: value === null }
    if (value !== null) edit(i, key, value)
  }
</script>

{#if doc.translating && missingIds}
  <div class="warn">
    {t('edit.needsIds')}
    <button class="link" onclick={assignIds}>{t('edit.assignIds')}</button>
  </div>
{/if}

<table style:--id-w={widths.id} style:--num-w={widths.num} style:--then-w={widths.then}>
  <thead>
    <tr>
      <th>{t('edit.id')}<InfoTip text={t('edit.idHelp')} /></th>
      {#if hasRoll}
        <th>{t('edit.range')}<InfoTip text={t('edit.rangeHelp')} /></th>
      {:else}
        <th>{t('edit.weight')}<InfoTip text={t('edit.weightHelp')} /></th>
      {/if}
      <th class="wide">{t('edit.result')}</th>
      <th>{t('edit.then')}<InfoTip text={t('edit.thenHelp')} /></th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {#each entries as entry, i (i)}
      <tr>
        <td class="id">
          <input
            type="text"
            value={entry.id ?? ''}
            disabled={doc.translating}
            onchange={(e) => edit(i, 'id', e.currentTarget.value.trim())}
          />
        </td>
        <td class="num">
          {#if hasRoll}
            <input
              type="text"
              value={entry.range ?? ''}
              disabled={doc.translating}
              onchange={(e) => edit(i, 'range', asRange(e.currentTarget.value))}
            />
          {:else}
            <input
              type="number"
              min="0"
              step="any"
              value={entry.weight ?? ''}
              placeholder="1"
              disabled={doc.translating}
              onchange={(e) =>
                edit(
                  i,
                  'weight',
                  e.currentTarget.value ? Number(e.currentTarget.value) : undefined,
                )}
            />
          {/if}
        </td>
        <td>
          {#if doc.translating}
            <input
              type="text"
              disabled={!entry.id}
              placeholder={entry.result ?? ''}
              value={entry.id ? doc.overlayText(['entries', entry.id]) : ''}
              onchange={(e) => doc.translate(['entries', entry.id!], e.currentTarget.value)}
            />
          {:else}
            <input
              type="text"
              value={entry.result ?? ''}
              onchange={(e) => edit(i, 'result', e.currentTarget.value)}
            />
          {/if}
          {#if advanced(entry) && !open[i]}
            <small>{t('edit.advanced')}</small>
          {/if}
        </td>
        <td class="then">
          <RefPicker
            {doc}
            table={entry.table}
            generator={entry.generator}
            disabled={doc.translating}
            onchange={(kind, target) => setTarget(i, kind, target)}
          />
        </td>
        <td class="row-actions">
          <div>
            <button
              class="icon"
              class:on={open[i]}
              aria-label={t('edit.more')}
              aria-expanded={!!open[i]}
              use:tooltip={t('edit.more')}
              disabled={doc.translating}
              onclick={() => (open = { ...open, [i]: !open[i] })}>⋯</button
            >
            <button
              class="icon"
              aria-label={t('edit.moveUp')}
              use:tooltip={t('edit.moveUp')}
              disabled={i === 0 || doc.translating}
              onclick={() => doc.save(moveIn(doc.content, id, path, i, i - 1))}>↑</button
            >
            <button
              class="icon"
              aria-label={t('edit.moveDown')}
              use:tooltip={t('edit.moveDown')}
              disabled={i === entries.length - 1 || doc.translating}
              onclick={() => doc.save(moveIn(doc.content, id, path, i, i + 1))}>↓</button
            >
            <button
              class="icon"
              aria-label={t('edit.duplicateRow')}
              use:tooltip={t('edit.duplicateRow')}
              disabled={doc.translating}
              onclick={() => duplicate(i)}>⧉</button
            >
            <button
              class="icon"
              aria-label={t('edit.remove')}
              use:tooltip={t('edit.remove')}
              disabled={entries.length <= 1 || doc.translating}
              onclick={() => doc.save(removeIn(doc.content, id, path, i))}>×</button
            >
          </div>
        </td>
      </tr>
      {#if open[i] && !doc.translating}
        <tr class="more">
          <td colspan="5">
            <div class="more-grid">
              <label>
                <span>{t('edit.when')}<InfoTip text={t('edit.whenHelp')} /></span>
                <input
                  type="text"
                  value={flowText(entry.when).replace(/^\{\s*|\s*\}$/g, '')}
                  placeholder="terrain: forest"
                  aria-invalid={invalid[`${i}.when`] || undefined}
                  onchange={(e) => editFlow(i, 'when', e.currentTarget.value)}
                />
                {#if invalid[`${i}.when`]}<small>{t('edit.notAMap')}</small>{/if}
              </label>
              <label>
                <span>{t('edit.set')}<InfoTip text={t('edit.setHelp')} /></span>
                <input
                  type="text"
                  value={flowText(entry.set).replace(/^\{\s*|\s*\}$/g, '')}
                  placeholder="weather: storm"
                  aria-invalid={invalid[`${i}.set`] || undefined}
                  onchange={(e) => editFlow(i, 'set', e.currentTarget.value)}
                />
                {#if invalid[`${i}.set`]}<small>{t('edit.notAMap')}</small>{/if}
              </label>
              <label class="inline">
                <input
                  type="checkbox"
                  checked={entry.once === true}
                  onchange={(e) => {
                    const on = e.currentTarget.checked
                    let text = setIn(doc.content, id, [...path, i, 'once'], on || undefined)
                    if (on) text = setIn(text, id, [...path, i, 'maxOccurrences'], undefined)
                    doc.save(text)
                  }}
                />
                {t('edit.once')}<InfoTip text={t('edit.onceHelp')} />
              </label>
              <label class="inline">
                {t('edit.maxOccurrences')}<InfoTip text={t('edit.maxOccurrencesHelp')} />
                <input
                  class="max"
                  type="number"
                  min="1"
                  step="1"
                  value={entry.maxOccurrences ?? ''}
                  disabled={entry.once === true}
                  onchange={(e) => {
                    const n = Math.floor(Number(e.currentTarget.value))
                    edit(i, 'maxOccurrences', n >= 1 ? n : undefined)
                  }}
                />
              </label>
            </div>
          </td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

{#if !doc.translating}
  <div class="bottom">
    <button onclick={() => add()}>{t('edit.addEntry')}</button>
    <button use:tooltip={t('edit.renumberHelp')} onclick={renumber}
      >{t('edit.renumber', { count: entries.length })}</button
    >
  </div>
{/if}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    padding: 4px;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 3px 4px;
    vertical-align: top;
  }

  td input {
    width: 100%;
  }

  .wide {
    width: 100%;
  }

  .id {
    width: var(--id-w);
    min-width: var(--id-w);
  }

  .num {
    width: var(--num-w);
    min-width: var(--num-w);
  }

  .then {
    width: var(--then-w);
    min-width: var(--then-w);
  }

  .row-actions {
    width: 1%;
  }

  .row-actions div {
    display: flex;
    gap: 2px;
  }

  .row-actions .icon {
    width: 24px;
    height: 28px;
  }

  .row-actions .icon.on {
    color: var(--accent);
  }

  tr.more td {
    padding: 2px 4px 10px;
  }

  .more-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 6px 12px;
    align-items: end;
    padding: 8px;
    background: rgb(255 255 255 / 0.03);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .more-grid label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .more-grid label.inline {
    flex-direction: row;
    gap: 6px;
    align-items: center;
  }

  .more-grid input[aria-invalid] {
    border-color: #c0605a;
  }

  .more-grid .max {
    width: 70px;
  }

  .row-actions .icon:disabled {
    opacity: 0.3;
    cursor: default;
  }

  small {
    font-size: 11px;
    color: #d8c58a;
  }

  .warn {
    font-size: 13px;
    color: #d8c58a;
  }

  .bottom {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .bottom button {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
