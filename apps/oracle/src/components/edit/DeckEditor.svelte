<script lang="ts">
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { insertIn, moveIn, removeIn, setIn } from '@open-tabletop/pack-ui/yaml'
  import { t, type MessageKey } from '../../lib/i18n'
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
    count?: number
  }

  const RESHUFFLES = ['when-empty', 'manual', 'after-draw'] as const

  const id = $derived(doc.def.localId)
  const cards = $derived((doc.raw.cards as RawCard[] | undefined) ?? [])
  const total = $derived(cards.reduce((n, c) => n + (c.count ?? 1), 0))
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
  <table>
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
            {#if card.set !== undefined}
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
      {/each}
    </tbody>
  </table>
  {#if !doc.translating}
    <div class="add-row"><button onclick={() => add()}>{t('edit.addCard')}</button></div>
  {/if}
</div>

<style>
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
    width: 50%;
  }

  .id {
    width: 110px;
  }

  .num {
    width: 70px;
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
    display: block;
  }
</style>
