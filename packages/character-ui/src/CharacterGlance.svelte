<script lang="ts">
  import { mainValue, type CharacterState, type Sheet } from '@open-tabletop/character-engine'
  import { characterValueView } from './display'
  import { translator } from './i18n'
  import { idName, sheetText } from './texts'
  import ValueControl from './ValueControl.svelte'

  /**
   * A character at a glance, where there's no room for its whole sheet (a fight's cards, the
   * party in rows): its name, its sheet's main value drawn as the sheet says (health as a
   * bar) and the conditions it has, each with what's left of one given for a while. `change`
   * is what just happened to its main value (`-2`), shown beside it for a moment.
   */
  let {
    sheet,
    character,
    locale,
    name = character.name ?? character.id,
    change = 0,
  }: {
    sheet: Sheet | undefined
    character: CharacterState
    locale: string
    name?: string
    change?: number
  } = $props()

  const t = translator(() => locale)
  /** Displays that don't say their number themselves: it's said beside them (`3/5`). */
  const COUNTED = ['boxes', 'ticks', 'pips', 'dial']
  const main = $derived(sheet ? mainValue(sheet) : undefined)
  const view = $derived(sheet && main ? characterValueView(sheet, character, main, locale) : null)
  const mainName = $derived(
    sheet && main ? (sheetText(sheet.values[main]!.name, locale) ?? idName(main)) : '',
  )
  /** The conditions it has, by the sheet's names, with what's left of them. */
  const conditions = $derived(
    Object.entries(character.conditions).map(([id, held]) => ({
      id,
      name: sheetText(sheet?.conditions[id]?.name, locale) ?? idName(id),
      left: held.left,
    })),
  )
</script>

<div class="glance">
  <span class="name">{name}</span>
  {#if view}
    <!-- Drawn, not changed: a click goes to whatever holds the glance (a card to pick). -->
    <span class="main" aria-label={mainName} inert>
      <ValueControl {view} label={mainName} {locale} disabled onset={() => {}} />
      {#if COUNTED.includes(view.display)}
        <span class="number"
          >{view.max !== undefined ? `${view.value}/${view.max}` : view.value}</span
        >
      {/if}
      {#if change}
        <span class="change" class:down={change < 0}
          >{change > 0 ? `+${change}` : `−${-change}`}</span
        >
      {/if}
    </span>
  {/if}
  {#if conditions.length}
    <ul class="conditions">
      {#each conditions as c (c.id)}
        <li>
          {c.name}{#if c.left !== undefined}<small> {t('left', { n: c.left })}</small>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .glance {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .main {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
  }

  .main > :global(.control) {
    flex: 1;
    min-width: 0;
    pointer-events: none;
  }

  .number {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* What just happened to it, for a moment: a blow in the danger colour, a gain in the accent. */
  .change {
    font-weight: 700;
    color: var(--accent);
    animation: change 1.6s ease-out both;
  }

  .change.down {
    color: var(--danger-text);
  }

  @keyframes change {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    20% {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .change {
      animation: none;
    }
  }

  .conditions {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .conditions li {
    padding: 0 6px;
    font-size: 11px;
    border: 1px solid var(--warning);
    border-radius: 999px;
  }
</style>
