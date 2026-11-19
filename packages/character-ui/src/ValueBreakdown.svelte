<script lang="ts">
  import {
    valueParts,
    type Catalogue,
    type CharacterState,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { portal } from '@open-tabletop/ui-kit'
  import { breakdownRows } from './breakdown'
  import { translator } from './i18n'
  import { idName, itemName, sheetText } from './texts'

  /**
   * Beside a value's control on a card (docs/value-breakdown.md): what it reads now when that
   * differs from its base (_→ 3_), or `ƒ` for a value made of others; a click shows why in a
   * small sum anchored to it (_Base 4, Burdened −1, Now 3_), closed by a click outside or
   * Escape. Nothing when nothing makes a difference.
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
  const rows = $derived(
    breakdownRows(
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
  const name = $derived(sheetText(sheet.values[id]?.name, locale) ?? idName(id))
  const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`)

  let button = $state<HTMLButtonElement>()
  let pop = $state<HTMLDivElement>()
  /** Where the sum shows, under the button (fixed, so no panel clips it); none while closed. */
  let at = $state<{ left: number; top: number }>()
  function toggle() {
    if (at || !button) return (at = undefined)
    const box = button.getBoundingClientRect()
    at = { left: Math.min(box.left, window.innerWidth - 240), top: box.bottom + 4 }
  }
  function outside(e: PointerEvent) {
    const target = e.target as Node
    if (at && !pop?.contains(target) && !button?.contains(target)) at = undefined
  }
</script>

<svelte:window
  onpointerdown={outside}
  onkeydown={(e) => {
    if (at && e.key === 'Escape') at = undefined
  }}
  onresize={() => (at = undefined)}
/>

{#if rows.length}
  <button
    bind:this={button}
    type="button"
    class="now"
    class:made={!differs}
    aria-expanded={!!at}
    aria-label={t('breakdown.open', { now: parts.now })}
    onclick={toggle}
  >
    {#if differs}<span class="arrow" aria-hidden="true">{parts.now > parts.base ? '↑' : '↓'}</span
      ><strong>{parts.now}</strong>{:else}<span class="f" aria-hidden="true">ƒ</span>{/if}
  </button>
  {#if at}
    <div
      bind:this={pop}
      use:portal
      class="sum"
      role="dialog"
      aria-label={name}
      style:left="{at.left}px"
      style:top="{at.top}px"
    >
      <p class="overline">{name}</p>
      <table>
        <tbody>
          {#each rows as row, i (i)}
            <tr class={row.kind}>
              <td colspan={row.kind === 'note' ? 2 : 1}>{row.label}</td>
              {#if row.kind !== 'note'}
                <td class="n"
                  >{row.amount === undefined
                    ? ''
                    : row.kind === 'signed'
                      ? signed(row.amount)
                      : row.amount}</td
                >
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}

<style>
  .now {
    display: inline-flex;
    gap: 3px;
    align-items: baseline;
    flex-shrink: 0;
    padding: 1px 7px;
    font-size: 16px;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .now:hover,
  .now[aria-expanded='true'] {
    border-color: var(--panel-border);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .arrow {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Made of others: the mark before the number it makes (_ƒ 12_). */
  .now.made {
    order: -1;
    padding: 1px 4px;
  }

  .f {
    font-family: serif;
    font-style: italic;
    font-size: 15px;
    color: var(--text-muted);
  }

  .sum {
    position: fixed;
    z-index: 50;
    min-width: 160px;
    max-width: 240px;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.35);
  }

  .sum .overline {
    margin: 0 0 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td {
    padding: 2px 0;
  }

  .n {
    padding-left: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  tr.total td {
    border-top: 1px solid var(--panel-border);
    font-weight: 600;
  }

  tr.note td {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
