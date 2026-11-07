<script lang="ts">
  import { writeRef } from '@open-tabletop/oracle-engine'
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { getLocale, t } from '../../lib/i18n'
  import { partChoices, partName } from '../../lib/newSystem'
  import { ROLLABLE, type SystemDoc } from '../../lib/systemDoc.svelte'

  /** `discover` in the bindings: what decides empty cells as the party travels. */
  let { doc, system }: { doc: SystemDoc; system?: TravelSystem } = $props()

  type Raw = Record<string, unknown>
  const disabled = $derived(!doc.editable)
  const discover = $derived((doc.bindings?.discover ?? {}) as Raw)
  const terrain = $derived((discover.terrain ?? {}) as Raw)
  const contents = $derived((discover.contents ?? {}) as Raw)
  const piece = $derived((discover.piece ?? {}) as Raw)
  const terrainValue = $derived(String(terrain.land ?? terrain.resolve ?? ''))
  const models = $derived(system ? partChoices(system, 'land') : [])

  /** Writes a binding, its `context` kept; empty, it goes, and `discover` with its last part. */
  function bind(key: 'terrain' | 'contents', value: string) {
    const old = (discover[key] ?? {}) as Raw
    const land = value.startsWith('land.') || value.includes('/land.')
    const next = value
      ? {
          ...(old.context !== undefined && !land && { context: old.context }),
          [land ? 'land' : 'resolve']: value,
        }
      : undefined
    write({ ...discover, [key]: next })
  }
  /** Writes a part of `discover.piece`; with nothing to resolve, it goes. */
  function bindPiece(patch: Raw) {
    const next: Raw = { ...piece, ...patch }
    for (const [key, value] of Object.entries(next)) if (value === '') delete next[key]
    write({ ...discover, piece: next.resolve ? next : undefined })
  }
  function write(next: Raw) {
    const kept = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
    const empty = !kept.terrain && !kept.contents && !kept.piece
    doc.edit('bindings', ['discover'], empty ? undefined : kept)
  }
  const refName = (ref: string) => doc.targets.find((x) => x.ref === ref)?.ref ?? ref
</script>

{#snippet rollables(value: string)}
  {#if value && !doc.targets.some((x) => x.ref === value) && !models.includes(value)}
    <option {value}>{value} ⚠</option>
  {/if}
  {#each ROLLABLE as kind (kind)}
    {@const of = doc.targets.filter((x) => x.kind === kind)}
    {#if of.length}
      <optgroup label={t(`kinds.${kind}`)}>
        {#each of as target (target.ref)}<option value={target.ref}>{refName(target.ref)}</option
          >{/each}
      </optgroup>
    {/if}
  {/each}
{/snippet}

<section>
  <h3>{t('discover.title')}<InfoTip text={t('discover.help')} /></h3>
  <div class="row">
    <label>
      <span>{t('discover.terrain')}<InfoTip text={t('discover.terrainHelp')} /></span>
      <select
        value={terrainValue}
        {disabled}
        onchange={(e) => bind('terrain', e.currentTarget.value)}
      >
        <option value="">{t('discover.none')}</option>
        {#if models.length}
          <optgroup label={t('discover.models')}>
            {#each models as id (id)}
              <option value={id}
                >{(system && partName(system, 'land', id)) ?? writeRef('land', id)}</option
              >
            {/each}
          </optgroup>
        {/if}
        {@render rollables(terrainValue)}
      </select>
    </label>
    <label>
      <span>{t('discover.contents')}<InfoTip text={t('discover.contentsHelp')} /></span>
      <select
        value={String(contents.resolve ?? '')}
        {disabled}
        onchange={(e) => bind('contents', e.currentTarget.value)}
      >
        <option value="">{t('discover.none')}</option>
        {@render rollables(String(contents.resolve ?? ''))}
      </select>
    </label>
    <label>
      <span>{t('discover.reveal')}<InfoTip text={t('discover.revealHelp')} /></span>
      <select
        value={String(discover.reveal ?? 'neighbors')}
        disabled={disabled || (!discover.terrain && !discover.contents && !discover.piece)}
        onchange={(e) =>
          write({
            ...discover,
            reveal: e.currentTarget.value === 'neighbors' ? undefined : e.currentTarget.value,
          })}
      >
        <option value="neighbors">{t('discover.neighbors')}</option>
        <option value="entered">{t('discover.entered')}</option>
        <option value="pieces">{t('discover.pieces')}</option>
      </select>
    </label>
  </div>
  <div class="row">
    <label>
      <span>{t('discover.piece')}<InfoTip text={t('discover.pieceHelp')} /></span>
      <select
        value={String(piece.resolve ?? '')}
        {disabled}
        onchange={(e) => bindPiece({ resolve: e.currentTarget.value })}
      >
        <option value="">{t('discover.none')}</option>
        {@render rollables(String(piece.resolve ?? ''))}
      </select>
    </label>
    <label>
      <span>{t('discover.first')}<InfoTip text={t('discover.firstHelp')} /></span>
      <input
        type="text"
        value={String(piece.first ?? '')}
        disabled={disabled || !piece.resolve}
        onchange={(e) => bindPiece({ first: e.currentTarget.value })}
      />
    </label>
    <label>
      <span>{t('discover.tries')}<InfoTip text={t('discover.triesHelp')} /></span>
      <input
        type="number"
        min="1"
        placeholder="3"
        value={piece.tries === undefined ? '' : String(piece.tries)}
        disabled={disabled || !piece.resolve}
        onchange={(e) =>
          bindPiece({ tries: e.currentTarget.value ? Number(e.currentTarget.value) : '' })}
      />
    </label>
    <label>
      <span>{t('discover.otherwise')}<InfoTip text={t('discover.otherwiseHelp')} /></span>
      <input
        type="text"
        value={String(piece.otherwise ?? '')}
        disabled={disabled || !piece.resolve}
        onchange={(e) => bindPiece({ otherwise: e.currentTarget.value })}
      />
    </label>
  </div>
  <div class="open">
    <label class="check">
      <input
        type="checkbox"
        checked={piece.keepOpen !== undefined}
        disabled={disabled || !piece.resolve}
        onchange={(e) => bindPiece({ keepOpen: e.currentTarget.checked ? true : '' })}
      />
      {t('discover.keepOpen')}<InfoTip text={t('discover.keepOpenHelp')} />
    </label>
    {#if piece.keepOpen !== undefined}
      <!-- Empty: always kept open; a condition: while it holds. -->
      <ConditionEditor
        value={typeof piece.keepOpen === 'object' ? piece.keepOpen : undefined}
        suggestions={{ 'pieces.total': [] }}
        locale={getLocale()}
        {disabled}
        label={t('discover.keepOpen')}
        onchange={(c) => bindPiece({ keepOpen: c ?? true })}
      />
    {/if}
  </div>
</section>

<style>
  h3 {
    margin: 0 0 8px;
  }

  .open {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 820px;
    margin-top: 10px;
  }

  .check {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 16px;
    max-width: 820px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
