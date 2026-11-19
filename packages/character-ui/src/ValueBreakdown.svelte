<script lang="ts">
  import {
    valueParts,
    type Catalogue,
    type CharacterState,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { breakdownLines } from './breakdown'
  import { translator } from './i18n'
  import { idName, itemName, sheetText } from './texts'

  /**
   * Why a value reads what it does, under it on a card (docs/value-breakdown.md): when it
   * reads other than what's kept (a condition adding), _Reads 3 now ↓_; for a value made of
   * others, _How it's made_. A click unfolds the sums in words (_Stealth 3 = 4 − 1
   * Burdened_), another folds them. Nothing when nothing makes a difference.
   */
  let {
    sheet,
    character,
    id,
    locale,
    catalogues = [],
  }: {
    sheet: Sheet
    character: CharacterState
    id: string
    locale: string
    catalogues?: readonly { id: string; def: Catalogue }[]
  } = $props()

  const t = translator(() => locale)
  const parts = $derived(valueParts(sheet, character, id))
  const lines = $derived(
    breakdownLines(
      id,
      parts,
      {
        value: (v) => sheetText(sheet.values[v]?.name, locale) ?? idName(v),
        condition: (c) => sheetText(sheet.conditions[c]?.name, locale) ?? idName(c),
        item: (p) =>
          itemName(
            character.items?.find((i) => i.key === p.key) ?? { id: p.id },
            catalogues,
            locale,
          ),
      },
      t,
    ),
  )
  const differs = $derived(parts.now !== parts.base)
  let open = $state(false)
</script>

{#if lines.length}
  <div class="breakdown">
    <button type="button" class="link" aria-expanded={open} onclick={() => (open = !open)}>
      {#if differs}{t('breakdown.readsNow', { now: parts.now })}
        <span aria-hidden="true">{parts.now > parts.base ? '↑' : '↓'}</span>{:else}{t(
          'breakdown.made',
        )}{/if}
    </button>
    {#if open}
      {#each lines as line, i (i)}<p class="hint">{line}</p>{/each}
    {/if}
  </div>
{/if}

<style>
  .breakdown {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
  }

  .breakdown button {
    align-self: flex-start;
    font-size: 12px;
  }

  .breakdown p {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
</style>
