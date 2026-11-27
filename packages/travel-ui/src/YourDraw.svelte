<script lang="ts">
  import type { DrawnCard, WantedDraw } from '@open-tabletop/oracle-engine'
  import { mathRandom } from '@open-tabletop/random'
  import { CardDeal, InfoTip, MoreMenu, StyledText, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * A draw from a deck that waits for the player (the trip's **Rolls**, docs/cards.md): what
   * it's drawn for, and one thing to do, **Draw**, dealt on the card table (the card chosen
   * here, among those still in the deck, as the dice of a roll on screen are rolled here). The
   * rest is behind **⋯**: the card drawn from a deck of their own (**Choose the card I
   * drew**), **Draw it for me**, and the way back (**Let the computer roll from now on**).
   */
  let {
    draw,
    what,
    who = '',
    locale,
    ondraw,
    onforme,
    oncomputer,
  }: {
    /** What the deck may give now, from the trip's draw waiting. */
    draw: WantedDraw
    /** What it's drawn for: the check's or deck's name. */
    what: string
    /** Who draws it (whoever's turn it is in a fight); '' for the party. */
    who?: string
    locale: string
    /** The card the player drew, and which way up. */
    ondraw: (card: DrawnCard) => void
    /** The computer draws it. */
    onforme: () => void
    /** The computer draws it, and rolls and draws everything after it. */
    oncomputer?: () => void
  } = $props()

  const t = translator(() => locale)
  const total = $derived(draw.cards.reduce((n, c) => n + c.count, 0))

  /** The card drawn on screen, dealt on the card table until it's seen. */
  let dealt = $state<DrawnCard>()
  /** The card of a deck of the player's own, being chosen (**⋯**). */
  let choosing = $state(false)
  let chosen = $state('')
  let reversed = $state(false)

  /** A card of the deck drawn here: each copy as likely, and which way up by the deck's chance. */
  function drawHere() {
    const random = mathRandom()
    let pick = random.next() * total
    const card = draw.cards.find((c) => (pick -= c.count) < 0) ?? draw.cards.at(-1)!
    dealt = {
      card: card.key,
      ...(draw.reversible !== undefined && { reversed: random.next() < draw.reversible }),
    }
  }

  const shown = $derived(dealt && draw.cards.find((c) => c.key === dealt!.card))
</script>

<form
  class="your-draw"
  onsubmit={(e) => {
    e.preventDefault()
    if (chosen) ondraw({ card: chosen, ...(draw.reversible !== undefined && { reversed }) })
  }}
>
  {#if draw.within}<p class="said">{draw.within}</p>{/if}
  <div class="head">
    <p class="what">
      {who ? t('yourDraw.who', { who, what }) : t('yourDraw.party', { what })}<InfoTip
        markdown={t('yourDraw.help')}
      />
    </p>
    <MoreMenu label={t('yourDraw.more')}>
      <button type="button" role="menuitem" onclick={() => (choosing = true)}
        >{t('yourDraw.choose')}</button
      >
      <button type="button" role="menuitem" onclick={onforme}>{t('yourDraw.forMe')}</button>
      {#if oncomputer}
        <button type="button" role="menuitem" onclick={oncomputer}>{t('yourRoll.computer')}</button>
      {/if}
    </MoreMenu>
  </div>
  <p class="left">{t('yourDraw.left', { count: total })}</p>
  {#if dealt && shown}
    <CardDeal
      cards={[
        {
          face: { ...shown.face, ...(dealt.reversed && { turned: true }) },
          caption: shown.text,
        },
      ]}
      title={who ? t('yourDraw.who', { who, what }) : t('yourDraw.party', { what })}
      use={t('yourDraw.see')}
      back={draw.back}
      left={total - 1}
      {locale}
      onuse={() => {
        const card = dealt!
        dealt = undefined
        ondraw(card)
      }}
      onclose={() => (dealt = undefined)}
    />
  {/if}
  {#if choosing}
    <!-- A card of a deck of the player's own: which one came out, and which way up. -->
    <div class="row">
      <label
        >{t('yourDraw.card')}
        <select bind:value={chosen}>
          <option value=""></option>
          {#each draw.cards as card (card.key)}
            <option value={card.key}>{card.text ?? card.key}</option>
          {/each}
        </select></label
      >
      {#if draw.reversible !== undefined}
        <label><input type="checkbox" bind:checked={reversed} /> {t('yourDraw.reversed')}</label>
      {/if}
      <button
        type="submit"
        class:primary={!!chosen}
        disabled={!chosen}
        use:tooltip={t('yourDraw.applyTip')}>{t('yourDraw.apply')}</button
      >
    </div>
    {#if chosen}
      {@const card = draw.cards.find((c) => c.key === chosen)}
      {#if card?.text}<p class="said"><StyledText text={card.text} /></p>{/if}
    {/if}
  {:else}
    <button
      type="button"
      class="primary draw"
      use:tooltip={t('yourDraw.drawTip')}
      onclick={drawHere}>{t('yourDraw.draw')}</button
    >
  {/if}
</form>

<style>
  .your-draw {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 2px solid var(--accent);
    border-radius: 8px;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .what {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .said,
  .left {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .said {
    font-style: italic;
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

  select {
    max-width: 22em;
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

  .draw {
    align-self: flex-start;
    padding: 6px 18px;
    font-size: 15px;
  }
</style>
