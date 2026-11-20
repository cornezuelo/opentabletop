<script lang="ts">
  import { splitRolls, type Resolution } from '@open-tabletop/oracle-engine'
  import { againstLine, CardSpread, DiceTray, PlayingCard } from '@open-tabletop/ui-kit'
  import type { OracleUi } from './ui'
  import Self from './ResultCard.svelte'

  let {
    ui,
    resolution,
    top = true,
    thrown = false,
  }: {
    ui: OracleUi
    resolution: Resolution
    top?: boolean
    /** Its dice were thrown on the table already: shown still, not tumbling again. */
    thrown?: boolean
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
    return [...asked, ...inside.map((r) => ({ ...r, inside: true }))]
  })
  const empty = $derived(!resolution.text && !resolution.entry && !resolution.children.length)
  /** The cards its fields drew (a hand, a spread), laid as it says. */
  const spread = $derived(
    resolution.children
      .filter((c) => c.face)
      .map((c) => ({ face: c.face!, place: c.place, caption: c.text })),
  )
</script>

<div class="result" class:top>
  {#if resolution.face}
    <!-- A card drawn: its face beside what it says. -->
    <div class="drawn">
      <PlayingCard face={resolution.face} width={top ? 120 : 56} label={resolution.text} />
      {#if resolution.text}<p class="text">{resolution.text}</p>{/if}
    </div>
  {:else if resolution.text}
    <p class="text">{resolution.text}</p>
  {:else if empty && top}
    <p class="text muted">{t('roll.nothing')}</p>
  {/if}
  {#if spread.length > 1 || (spread.length && top)}
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
  {#if resolution.rolls.length}
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
