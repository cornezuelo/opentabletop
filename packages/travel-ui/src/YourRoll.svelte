<script lang="ts">
  import { parseDice, rollWith, type DiceMode, type DiceResult } from '@open-tabletop/dice'
  import { mathRandom } from '@open-tabletop/random'
  import { DiceThrow, DiceTray, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * A roll that waits for the player (the trip's **Rolls**): what to roll and why (_Kael:
   * roll 1d6 for Omens_), a box for the total the player rolled with their own dice, **Roll**
   * on screen for whoever has none at hand (the dice drawn as they fall, the total written in),
   * **Roll it for me**, and the way back (**Let the computer roll from now on**). A roll inside
   * a result (a blow's damage) says what came up so far and whom it's for.
   */
  let {
    dice,
    what,
    who = '',
    on = '',
    said = '',
    mode = '',
    how,
    locale,
    ongive,
    onforme,
    oncomputer,
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
    locale: string
    /** The total the player rolled. */
    ongive: (total: number) => void
    /** The computer rolls it. */
    onforme: () => void
    /** The computer rolls it, and every roll after it. */
    oncomputer?: () => void
  } = $props()

  const t = translator(() => locale)
  let total = $state<number | undefined>()
  let rolled = $state<DiceResult | undefined>()
  /** The dice on screen being thrown (**Roll**): across a table, in the middle of the screen. */
  let throwing = $state(false)
  // A new roll starts empty.
  $effect(() => {
    void dice
    void what
    void who
    void on
    void said
    total = undefined
    rolled = undefined
  })
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

  function rollHere() {
    if (!parsed) return
    rolled = rollWith(parsed, mathRandom(), how)
    throwing = true
  }
</script>

<form
  class="your-roll"
  onsubmit={(e) => {
    e.preventDefault()
    if (given) ongive(total!)
  }}
>
  {#if said}<p class="said">{said}</p>{/if}
  <p class="what">
    {who ? t('yourRoll.who', { who, dice, what }) : t('yourRoll.party', { dice, what })}{#if on}{t(
        'yourRoll.on',
        { target: on },
      )}{/if}{#if mode}{t('yourRoll.mode', { mode })}{/if}<InfoTip markdown={t('yourRoll.help')} />
  </p>
  {#if rolled && throwing}
    <DiceThrow
      result={rolled}
      title={who ? t('yourRoll.who', { who, dice, what }) : t('yourRoll.party', { dice, what })}
      {locale}
      onuse={(n) => {
        throwing = false
        total = n
        ongive(n)
      }}
      onclose={() => {
        // Put away unused: the total is written in, for Apply or another.
        throwing = false
        total = rolled?.total
      }}
    />
  {:else if rolled}<DiceTray rolls={[rolled]} {locale} />{/if}
  <div class="row">
    <label
      >{t('yourRoll.total')}
      <!-- svelte-ignore a11y_autofocus -->
      <input type="number" step="1" bind:value={total} autofocus /></label
    >
    <button type="submit" class="primary" disabled={!given} use:tooltip={t('yourRoll.applyTip')}
      >{t('yourRoll.apply')}</button
    >
    {#if parsed}
      <button type="button" use:tooltip={t('yourRoll.rollTip')} onclick={rollHere}
        >{t('yourRoll.roll')}</button
      >
    {/if}
    <button type="button" use:tooltip={t('yourRoll.forMeTip')} onclick={onforme}
      >{t('yourRoll.forMe')}</button
    >
  </div>
  {#if oncomputer}
    <button type="button" class="link" onclick={oncomputer}>{t('yourRoll.computer')}</button>
  {/if}
</form>

<style>
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

  button.link {
    align-self: flex-start;
    padding: 0;
    color: var(--text-muted);
    background: none;
    border: none;
    text-decoration: underline;
  }
</style>
