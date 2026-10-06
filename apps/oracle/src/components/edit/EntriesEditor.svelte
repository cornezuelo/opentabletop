<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
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
</script>

{#if doc.translating && missingIds}
  <div class="warn">
    {t('edit.needsIds')}
    <button class="link" onclick={assignIds}>{t('edit.assignIds')}</button>
  </div>
{/if}

<table>
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
          {#if advanced(entry)}
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
    width: 50%;
  }

  .id {
    width: 80px;
  }

  .num {
    width: 76px;
  }

  .then {
    width: 230px;
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
