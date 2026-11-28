<script lang="ts">
  import { splitRolls, type Resolution } from '@open-tabletop/oracle-engine'
  import {
    againstLine,
    CardSpread,
    DiceTray,
    markdownText,
    PlayingCard,
    StyledText,
  } from '@open-tabletop/ui-kit'
  import type { OracleUi } from './ui'
  import { drawnCards } from './drawnCards'
  import Self from './ResultCard.svelte'

  let {
    ui,
    resolution,
    top = true,
    thrown = false,
    onTable = false,
  }: {
    ui: OracleUi
    resolution: Resolution
    top?: boolean
    /** Its dice were thrown on the table already: shown still, not tumbling again. */
    thrown?: boolean
    /**
     * Its dice and cards lie on the table above it (the Oracle's page): not drawn again here,
     * only what they say (and the dice a row rolled inside it, which weren't thrown).
     */
    onTable?: boolean
  } = $props()
  const t = $derived(ui.t)

  const scalars = $derived(
    Object.entries(resolution.value).filter(
      ([key, v]) => key !== 'text' && (typeof v !== 'object' || v === null),
    ),
  )
  /** Its dice: those asked for, then those its row rolled inside it, said so. */
  const dice = $derived.by(() => {
    const { asked, inside } = splitRolls(resolution)
    return [...(onTable ? [] : asked), ...inside.map((r) => ({ ...r, inside: true }))]
  })
  /** On the table, the dice thrown there: only their sums. */
  const thrownSums = $derived(
    onTable ? splitRolls(resolution).asked.filter((r) => r.terms.length) : [],
  )
  const empty = $derived(!resolution.text && !resolution.entry && !resolution.children.length)
  /** The cards its fields drew (a hand, a spread), laid as it says. */
  const spread = $derived(
    drawnCards(resolution).map((c) => ({ face: c.face, place: c.place, caption: c.text })),
  )
</script>

<div class="result" class:top>
  {#if resolution.kind === 'deck' && !onTable}
    <!-- A card drawn: its face (or its words, when it has none) beside what it says. -->
    <div class="drawn">
      <PlayingCard
        face={resolution.face ?? {}}
        width={top ? 120 : 56}
        label={markdownText(resolution.text ?? '')}
      />
      {#if resolution.text}<p class="text"><StyledText text={resolution.text} /></p>{/if}
    </div>
  {:else if resolution.text}
    <p class="text"><StyledText text={resolution.text} /></p>
  {:else if empty && top}
    <p class="text muted">{t('roll.nothing')}</p>
  {/if}
  {#if !onTable && (spread.length > 1 || (spread.length && top))}
    <CardSpread cards={spread} width={top ? 72 : 48} />
  {/if}
  {#if scalars.length}
    <dl>
      {#each scalars as [key, value] (key)}
        <div>
          <dt>{key}</dt>
          <dd>{String(value)}</dd>
        </div>
      {/each}
    </dl>
  {/if}
  {#if onTable && thrownSums.length}
    <!-- The dice lie on the table above: what they added up to. -->
    <p class="sums">
      {#each thrownSums as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
        <strong>{roll.total}</strong>{/each}
    </p>
  {/if}
  {#if dice.length}
    <!-- The dice it was rolled with, tumbling as a roll just made appears. -->
    <div class="dice">
      <DiceTray rolls={dice} locale={ui.locale()} large={top} animate={top && !thrown} />
    </div>
  {/if}
  {#if resolution.against}
    <!-- Rolled against a number: what it was and whether it made it. -->
    <p class="against" class:made={resolution.against.success}>
      {againstLine(resolution.against, ui.locale())}
    </p>
  {/if}
  {#if resolution.children.length}
    <details open={!top}>
      <summary>{t('roll.details')}</summary>
      {#each resolution.children as child, i (i)}
        <div class="child">
          <span class="source">{ui.nameOf(child.source)}</span>
          <Self {ui} resolution={child} top={false} />
        </div>
      {/each}
    </details>
  {/if}
</div>

<style>
  .drawn {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .text {
    margin: 0;
    white-space: pre-wrap;
  }

  .top > .text {
    font-family: 'Georgia', serif;
    font-size: 20px;
    line-height: 1.35;
  }

  .muted {
    color: var(--text-muted);
  }

  .sums {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .sums strong {
    color: var(--text);
  }

  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin: 0;
    font-size: 12px;
  }

  dl div {
    display: flex;
    gap: 4px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  .dice {
    font-size: 13px;
  }

  details summary {
    font-size: 12px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .child {
    margin: 6px 0 0 4px;
    padding-left: 10px;
    border-left: 2px solid var(--panel-border);
  }

  .source {
    font-size: 12px;
    color: var(--accent);
  }

  .against {
    margin: 4px 0 0;
    font-weight: 700;
    color: var(--danger-text);
  }

  .against.made {
    color: var(--good);
  }
</style>
