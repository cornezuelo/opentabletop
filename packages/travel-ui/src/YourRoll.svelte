<script lang="ts">
  import { parseDice, rollWith, type DiceMode, type DiceResult } from '@open-tabletop/dice'
  import { mathRandom } from '@open-tabletop/random'
  import { DiceThrow, DiceTray, InfoTip, MoreMenu, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { RollRow } from './turns'

  /**
   * A roll that waits for the player (the trip's **Rolls**): what to roll and why (_Kael:
   * roll 1d6 for Omens_, how its roll mode rolls, what a short table can give: `rows`), and
   * one thing to do, **Roll**, on screen (the dice thrown across a table). The rest is behind
   * **⋯**: the total of dice of their own, **Roll it for me**, and the way back (**Let the
   * computer roll from now on**). A roll inside a result (a blow's damage) says what came up
   * so far and whom it's for.
   *
   * `staged` (a fight's stage, docs/fight-turn.md): the dice wait on a table right here, to be
   * clicked or thrown, and their total is taken as they stop.
   */
  let {
    dice,
    what,
    who = '',
    on = '',
    said = '',
    mode = '',
    how,
    rows,
    staged = false,
    locale,
    ongive,
    onforme,
    oncomputer,
    onthrow,
  }: {
    /** The table's dice, as it writes them (`1d6`). */
    dice: string
    /** What it's rolled for: the check's or table's name. */
    what: string
    /** Who rolls it (whoever's turn it is in a fight); '' for the party. */
    who?: string
    /** Whom it's for (one a result aims at, each with their own roll); '' for none. */
    on?: string
    /** What the result says so far, when the roll is inside it. */
    said?: string
    /** The roll mode's name it's rolled with (Advantage); '' for none. */
    mode?: string
    /** How that mode rolls, for **Roll**. */
    how?: DiceMode
    /** What the roll can give: the rows of its table, when it's short (travel-ui's `ladderOf`). */
    rows?: readonly RollRow[]
    /** On a fight's stage: thrown right here, its total taken as the dice stop. */
    staged?: boolean
    locale: string
    /** The total the player rolled. */
    ongive: (total: number) => void
    /** The computer rolls it. */
    onforme: () => void
    /** The computer rolls it, and every roll after it. */
    oncomputer?: () => void
    /**
     * **Roll** on screen thrown by the host (which keeps the table open to tell what came of
     * it): the dice rolled, what it's rolled for and why. Absent, thrown here.
     */
    onthrow?: (rolled: DiceResult, title: string, why: string[]) => void
  } = $props()

  const t = translator(() => locale)
  let total = $state<number | undefined>()
  let rolled = $state<DiceResult | undefined>()
  /** The dice on screen being thrown (**Roll**): across a table, in the middle of the screen. */
  let throwing = $state(false)
  /** The total of dice of the player's own asked for (**⋯**), or the only way (dice not read). */
  let byHand = $state(false)
  const given = $derived(typeof total === 'number' && Number.isInteger(total))
  /** Dice that can be rolled here: written plainly (no `{{…}}` read from the trip). */
  const parsed = $derived.by(() => {
    if (dice.includes('{{')) return undefined
    try {
      return parseDice(dice)
    } catch {
      return undefined
    }
  })
  // A new roll starts empty; on a stage its dice are made at once, waiting to be thrown.
  $effect(() => {
    void what
    void who
    void on
    void said
    total = undefined
    byHand = false
    rolled = staged && parsed ? rollWith(parsed, mathRandom(), how) : undefined
  })
  /** How its roll mode rolls, in words (_2 rolls, the lowest kept_); '' for none. */
  const modeHow = $derived(
    how?.repeat && how.repeat > 1 && how.keep
      ? t(how.keep === 'lowest' ? 'yourRoll.keepLowest' : 'yourRoll.keepHighest', {
          n: how.repeat,
        })
      : '',
  )

  /** What it's rolled for, in one line (_Kael: roll 1d6 for A blow_, on whom, with what mode). */
  const title = $derived(
    (who ? t('yourRoll.who', { who, dice, what }) : t('yourRoll.party', { dice, what })) +
      (on ? t('yourRoll.on', { target: on }) : '') +
      (mode ? t('yourRoll.mode', { mode }) : ''),
  )
  /** The row a total falls on, among `rows`. */
  const rowOf = (n: number | undefined) =>
    n === undefined
      ? undefined
      : rows?.find((r) => {
          const [lo, hi = lo] = r.range.split('–').map(Number)
          return n >= lo! && n <= hi!
        })?.key

  function rollHere() {
    if (!parsed) return
    rolled = rollWith(parsed, mathRandom(), how)
    if (onthrow) {
      onthrow(rolled, title, said ? [said] : [])
      rolled = undefined
      return
    }
    throwing = true
  }
</script>

<form
  class="your-roll"
  class:staged
  onsubmit={(e) => {
    e.preventDefault()
    if (given) ongive(total!)
  }}
>
  {#if said}<p class="said">{said}</p>{/if}
  <div class="head">
    <p class="what">
      {who
        ? t('yourRoll.who', { who, dice, what })
        : t('yourRoll.party', { dice, what })}{#if on}{t('yourRoll.on', {
          target: on,
        })}{/if}{#if mode}{t('yourRoll.mode', { mode })}{/if}<InfoTip
        markdown={t('yourRoll.help')}
      />
    </p>
    <MoreMenu label={t('yourRoll.more')}>
      <button type="button" role="menuitem" onclick={() => (byHand = true)}
        >{t('yourRoll.mine')}</button
      >
      <button type="button" role="menuitem" onclick={onforme}>{t('yourRoll.forMe')}</button>
      {#if oncomputer}
        <button type="button" role="menuitem" onclick={oncomputer}>{t('yourRoll.computer')}</button>
      {/if}
    </MoreMenu>
  </div>
  {#if modeHow}<p class="how">{modeHow}</p>{/if}
  {#if rows?.length}
    <!-- What it can give: the row the total fell on lit once it's known. -->
    {@const hit = rowOf(given ? total : undefined)}
    <ol class="ladder" aria-label={t('yourRoll.ladder')}>
      {#each rows as r (r.key)}
        <li class:hit={r.key === hit}><span class="range">{r.range}</span> {r.text}</li>
      {/each}
    </ol>
  {/if}
  {#if staged && rolled && !byHand}
    <!-- On a stage: the dice wait on their table, right here. -->
    {#key rolled}
      <DiceThrow
        rolls={[rolled]}
        inline
        {locale}
        onuse={(n) => {
          total = n
          ongive(n)
        }}
      />
    {/key}
  {:else if rolled && throwing}
    <DiceThrow
      rolls={[rolled]}
      {title}
      why={said ? [said] : []}
      {locale}
      onuse={(n) => {
        throwing = false
        total = n
        ongive(n)
      }}
      onclose={() => {
        // Put away unused: the total is written in, for Apply or another.
        throwing = false
        byHand = true
        total = rolled?.total
      }}
    />
  {:else if rolled && !staged}<DiceTray rolls={[rolled]} {locale} />{/if}
  <!-- One thing to do: throw them on screen, large. -->
  {#if parsed && !staged && !byHand}
    <button
      type="button"
      class="primary throw"
      use:tooltip={t('yourRoll.rollTip')}
      onclick={rollHere}>{t('yourRoll.roll')}</button
    >
  {/if}
  {#if byHand || !parsed}
    <!-- Dice of the player's own (or dice that can't be rolled here): their total. -->
    <div class="row">
      <label
        >{t('yourRoll.total')}
        <input type="number" step="1" bind:value={total} /></label
      >
      <button
        type="submit"
        class:primary={given}
        disabled={!given}
        use:tooltip={t('yourRoll.applyTip')}>{t('yourRoll.apply')}</button
      >
    </div>
  {/if}
</form>

<style>
  .throw {
    align-self: flex-start;
    padding: 6px 18px;
    font-size: 15px;
  }

  .your-roll {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 2px solid var(--accent);
    border-radius: 8px;
  }

  .said {
    margin: 0;
    font-size: 13px;
    font-style: italic;
    color: var(--text-muted);
  }

  .what {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }

  input {
    width: 5em;
  }

  button {
    padding: 4px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button.primary:not(:disabled) {
    font-weight: 600;
    border-color: var(--accent);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* What's rolled, and the rest of the ways behind ⋯ at its end. */
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .how {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  /* What the roll can give, a row each; the one it fell on lit. */
  .ladder {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
  }

  .ladder li {
    padding: 2px 8px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
  }

  .ladder li.hit {
    color: var(--text);
    border-color: var(--accent);
  }

  .ladder .range {
    font-weight: 600;
    color: var(--text);
  }

  /* On a fight's stage: large, centred, no frame of its own. */
  .staged {
    padding: 0;
    border: none;
  }

  .staged .what {
    font-size: 16px;
  }

  .staged .ladder {
    font-size: 13px;
  }
</style>
