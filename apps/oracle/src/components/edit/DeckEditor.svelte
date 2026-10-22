<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { PairEditor } from '@open-tabletop/pack-ui'
  import { effectSuggestions, setSuggestions } from '@open-tabletop/session'
  import { workspace } from '../../lib/packs/workspace.svelte'
  import { insertIn, moveIn, removeIn, setIn } from '@open-tabletop/pack-ui/yaml'
  import { getLocale, t, type MessageKey } from '../../lib/i18n'
  import { nextId, type DefinitionDoc } from '../../lib/packs/doc.svelte'
  import RefPicker from './RefPicker.svelte'

  /** A deck: cards (with copies) drawn without replacement until reshuffled. */
  let { doc }: { doc: DefinitionDoc } = $props()

  interface RawCard {
    id: string
    result?: string
    table?: string
    generator?: string
    set?: unknown
    effects?: unknown
    pause?: boolean
    count?: number
  }

  /** Cards showing what they set, change and whether they pause. */
  let open = $state<Record<number, boolean>>({})
  const setHints = $derived(setSuggestions(workspace.registry))
  const effectHints = $derived(effectSuggestions(workspace.registry))

  const RESHUFFLES = ['when-empty', 'manual', 'after-draw'] as const

  const id = $derived(doc.def.localId)
  const cards = $derived((doc.raw.cards as RawCard[] | undefined) ?? [])
  const total = $derived(cards.reduce((n, c) => n + (c.count ?? 1), 0))

  /** Columns sized to what they hold (in characters); the text column takes the rest. */
  const fit = (values: unknown[], min: number, max: number) =>
    `${Math.min(max, Math.max(min, ...values.map((v) => String(v ?? '').length))) + 3}ch`
  const widths = $derived.by(() => {
    const refs = cards.map((c) => c.table ?? c.generator)
    return {
      id: fit(
        cards.map((c) => c.id),
        3,
        20,
      ),
      num: fit(
        cards.map((c) => c.count ?? 1),
        2,
        8,
      ),
      then: refs.some(Boolean) ? `calc(100px + ${fit(refs, 6, 26)})` : '110px',
    }
  })
  const edit = (i: number, key: string, value: unknown) => doc.edit(['cards', i, key], value)

  function setTarget(i: number, kind: 'table' | 'generator' | '', target: string) {
    let text = setIn(doc.content, id, ['cards', i, 'table'], undefined)
    text = setIn(text, id, ['cards', i, 'generator'], undefined)
    if (kind && target) text = setIn(text, id, ['cards', i, kind], target)
    doc.save(text)
  }

  function add(at = cards.length, card?: RawCard) {
    const next = card
      ? {
          ...card,
          id: nextId(
            cards.map((c) => c.id),
            'c',
          ),
        }
      : {
          id: nextId(
            cards.map((c) => c.id),
            'c',
          ),
          result: '',
        }
    doc.save(insertIn(doc.content, id, ['cards'], at, next))
  }
</script>

<div class="deck">
  <label class="field reshuffle">
    <span>{t('edit.reshuffle')}<InfoTip text={t('edit.reshuffleHelp')} /></span>
    <select
      value={doc.raw.reshuffle ?? 'when-empty'}
      disabled={doc.translating}
      onchange={(e) =>
        doc.edit(
          ['reshuffle'],
          e.currentTarget.value === 'when-empty' ? undefined : e.currentTarget.value,
        )}
    >
      {#each RESHUFFLES as r (r)}
        <option value={r}>{t(`edit.reshuffles.${r}` as MessageKey)}</option>
      {/each}
    </select>
  </label>

  <h3 class="section-title">{t('edit.cards', { count: total })}</h3>
  <table style:--id-w={widths.id} style:--num-w={widths.num} style:--then-w={widths.then}>
    <thead>
      <tr>
        <th>{t('edit.id')}<InfoTip text={t('edit.cardIdHelp')} /></th>
        <th>{t('edit.copies')}<InfoTip text={t('edit.copiesHelp')} /></th>
        <th class="wide">{t('edit.cardText')}</th>
        <th>{t('edit.then')}<InfoTip text={t('edit.thenHelp')} /></th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each cards as card, i (i)}
        <tr>
          <td class="id">
            <input
              type="text"
              value={card.id}
              disabled={doc.translating}
              onchange={(e) =>
                e.currentTarget.value.trim() && edit(i, 'id', e.currentTarget.value.trim())}
            />
          </td>
          <td class="num">
            <input
              type="number"
              min="1"
              step="1"
              value={card.count ?? 1}
              disabled={doc.translating}
              onchange={(e) => {
                const n = Math.max(1, Math.round(Number(e.currentTarget.value) || 1))
                edit(i, 'count', n === 1 ? undefined : n)
              }}
            />
          </td>
          <td>
            {#if doc.translating}
              <input
                type="text"
                placeholder={card.result ?? ''}
                value={doc.overlayText(['cards', card.id])}
                onchange={(e) => doc.translate(['cards', card.id], e.currentTarget.value)}
              />
            {:else}
              <input
                type="text"
                value={card.result ?? ''}
                onchange={(e) => edit(i, 'result', e.currentTarget.value)}
              />
            {/if}
            {#if (card.set !== undefined || card.effects !== undefined || card.pause) && !open[i]}
              <small class="note">{t('edit.advanced')}</small>
            {/if}
          </td>
          <td class="then">
            <RefPicker
              {doc}
              table={card.table}
              generator={card.generator}
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
                onclick={() => doc.save(moveIn(doc.content, id, ['cards'], i, i - 1))}>↑</button
              >
              <button
                class="icon"
                aria-label={t('edit.moveDown')}
                use:tooltip={t('edit.moveDown')}
                disabled={i === cards.length - 1 || doc.translating}
                onclick={() => doc.save(moveIn(doc.content, id, ['cards'], i, i + 1))}>↓</button
              >
              <button
                class="icon"
                aria-label={t('edit.duplicateRow')}
                use:tooltip={t('edit.duplicateRow')}
                disabled={doc.translating}
                onclick={() => add(i + 1, card)}>⧉</button
              >
              <button
                class="icon"
                aria-label={t('edit.remove')}
                use:tooltip={t('edit.remove')}
                disabled={cards.length <= 1 || doc.translating}
                onclick={() => doc.save(removeIn(doc.content, id, ['cards'], i))}>×</button
              >
            </div>
          </td>
        </tr>
        {#if open[i] && !doc.translating}
          <tr class="more">
            <td colspan="5">
              <div class="more-grid">
                <div class="field">
                  <span>{t('edit.set')}<InfoTip text={t('edit.setHelp')} /></span>
                  <PairEditor
                    value={card.set}
                    keys={Object.keys(setHints)}
                    values={setHints}
                    keyLabel={t('edit.setKey')}
                    locale={getLocale()}
                    label={t('edit.set')}
                    onchange={(map) => edit(i, 'set', map)}
                  />
                </div>
                <div class="field">
                  <span>{t('edit.effects')}<InfoTip text={t('edit.effectsHelp')} /></span>
                  <PairEditor
                    value={card.effects}
                    keys={Object.keys(effectHints)}
                    values={effectHints}
                    keyLabel={t('edit.effectsKey')}
                    locale={getLocale()}
                    label={t('edit.effects')}
                    onchange={(map) => edit(i, 'effects', map)}
                  />
                </div>
                <label class="inline">
                  <input
                    type="checkbox"
                    checked={card.pause === true}
                    onchange={(e) => edit(i, 'pause', e.currentTarget.checked || undefined)}
                  />
                  {t('edit.pause')}<InfoTip text={t('edit.pauseHelp')} />
                </label>
              </div>
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
  {#if !doc.translating}
    <div class="add-row"><button onclick={() => add()}>{t('edit.addCard')}</button></div>
  {/if}
</div>

<style>
  /* As a table entry's: Sets · Changes, then Pause. */
  .more-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px 16px;
    align-items: start;
    padding: 8px;
    background: rgb(255 255 255 / 0.03);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .more-grid .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .more-grid .inline {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    justify-self: start;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .more-grid .inline input {
    width: auto;
  }

  .icon.on {
    color: var(--accent);
  }

  .deck {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .reshuffle {
    width: 220px;
  }

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

  .row-actions .icon:disabled {
    opacity: 0.3;
    cursor: default;
  }

  small {
    display: block;
  }
</style>
