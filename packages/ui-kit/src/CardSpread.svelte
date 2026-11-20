<script lang="ts">
  import PlayingCard from './PlayingCard.svelte'
  import { tooltip } from './tooltip'

  type Face = import('svelte').ComponentProps<typeof PlayingCard>['face']

  /**
   * Cards laid on the table as a spread says (docs/oracle-engine.md, _Cards with faces_): each
   * at its `[column, row]`, one lying `across` another turned a quarter over it; those without
   * a place in a row after them, each with its name under it, when given (a laid card says it
   * on hover: the spread's text tells them all, and names under it would cover the next row).
   */
  let {
    cards,
    width = 72,
  }: {
    cards: { face: Face; place?: { at?: [number, number]; across?: boolean }; caption?: string }[]
    width?: number
  } = $props()

  const placed = $derived(cards.filter((c) => c.place?.at))
  const loose = $derived(cards.filter((c) => !c.place?.at))
  const columns = $derived(Math.max(0, ...placed.map((c) => c.place!.at![0] + 1)))
  /** A cell: the card's width with room around it for one lying across. */
  const cell = $derived(Math.round(width * 1.75))
</script>

{#if placed.length}
  <div
    class="spread"
    style:grid-template-columns="repeat({columns}, {cell}px)"
    style:grid-auto-rows="{Math.round(width * 1.6) + 8}px"
  >
    {#each placed as card, i (i)}
      <figure
        class:across={card.place?.across}
        style:grid-column={card.place!.at![0] + 1}
        style:grid-row={card.place!.at![1] + 1}
        use:tooltip={card.caption ?? ''}
      >
        <PlayingCard face={card.face} {width} label={card.caption} />
      </figure>
    {/each}
  </div>
{/if}
{#if loose.length}
  <div class="row">
    {#each loose as card, i (i)}
      <figure>
        <PlayingCard face={card.face} {width} label={card.caption} />
        {#if card.caption}<figcaption style:max-width="{width + 24}px">
            {card.caption}
          </figcaption>{/if}
      </figure>
    {/each}
  </div>
{/if}

<style>
  .spread {
    display: grid;
    gap: 6px;
    justify-content: start;
    overflow-x: auto;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  figure {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    margin: 0;
  }

  .spread figure {
    justify-content: center;
  }

  /* The card lying across the one at its place, turned a quarter over it. */
  figure.across {
    z-index: 1;
    transform: rotate(90deg);
  }

  figcaption {
    font-size: 11px;
    line-height: 1.2;
    color: var(--text-muted);
    text-align: center;
  }
</style>
