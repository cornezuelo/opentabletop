<script lang="ts" generics="T extends CampaignFactions">
  import { withNotes, type CampaignFactions } from '@open-tabletop/campaign'
  import { CharacterCard } from '@open-tabletop/character-ui'
  import {
    factionName,
    localize,
    type LocalizedText,
    type SystemFactions,
  } from '@open-tabletop/session'
  import { busy, InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import type { Snippet } from 'svelte'
  import FactionNotes from './FactionNotes.svelte'
  import { factionColor } from './factions'
  import { translator } from './i18n'

  /**
   * The factions of a campaign, as every app shows them: a folded card per faction (its
   * colour, name and the hexes it holds; unfolded, what the system says it is, the GM's
   * notes and its sheet), then a world turn by hand and whether turns come by themselves.
   * The app adds its own pieces to each card (`head`: on the line, `top`: first inside).
   */
  let {
    own,
    system,
    locale,
    territories,
    open,
    ontoggle,
    head,
    top,
    onchange,
    onturn,
  }: {
    own: T
    /** The system they came from (their names, colours and sheet). */
    system: SystemFactions
    locale: string
    /** The hexes each holds on the map in sight; absent: no map, no count. */
    territories?: Record<string, string[]>
    /** The faction unfolded at first. */
    open?: string
    ontoggle?: (id: string, opened: boolean) => void
    head?: Snippet<[string]>
    top?: Snippet<[string]>
    onchange: (next: T) => void
    onturn: () => void | Promise<void>
  } = $props()

  const t = translator(() => locale)
  const name = (id: string) => factionName(system, id, locale)
  /** What the system says a faction is (its `description`), in the UI's language. */
  const about = (id: string) =>
    localize(system.def.factions[id]?.description as LocalizedText | undefined, locale) || ''
  const count = (id: string) => {
    const n = territories?.[id]?.length ?? 0
    return n === 1 ? t('factions.territoryOne') : t('factions.territory', { n })
  }

  /** A world turn being played: its button turns until it's done. */
  let turning = $state(false)
  async function turn() {
    if (turning) return
    turning = true
    try {
      // Let the button show it before the turn (all at once) is played.
      await new Promise((resolve) => setTimeout(resolve, 30))
      await onturn()
    } finally {
      turning = false
    }
  }
</script>

<div class="cards">
  {#each own.factions as faction (faction.id)}
    <details
      class="faction"
      open={open === faction.id}
      ontoggle={(e) => ontoggle?.(faction.id, e.currentTarget.open)}
    >
      <summary>
        <span class="swatch" style:background={factionColor(system, faction.id)}></span>
        <span class="who">
          <strong>{name(faction.id)}</strong>
          {#if territories}<span class="count">{count(faction.id)}</span>{/if}
        </span>
        {@render head?.(faction.id)}
      </summary>
      {@render top?.(faction.id)}
      {#if about(faction.id)}<Markdown class="about" text={about(faction.id)} />{/if}
      <FactionNotes
        notes={own.notes?.[faction.id]}
        name={name(faction.id)}
        {locale}
        onchange={(change) => onchange(withNotes(own, faction.id, change))}
      />
      <CharacterCard
        sheet={system.sheet.def}
        character={faction}
        {locale}
        named={false}
        path={`factions.${faction.id}`}
        onchange={(next) =>
          onchange({
            ...own,
            factions: own.factions.map((f) => (f.id === next.id ? next : f)),
          })}
      />
    </details>
  {/each}
</div>

<!-- The help beside the button, not on it: pressing it runs the turn. -->
<div class="row">
  <button use:busy={turning} onclick={turn}>{t('factions.turn')}</button>
  <span class="help">{t('whatItDoes')}<InfoTip markdown={t('factions.turnHelp')} /></span>
</div>
{#if system.def.every}
  <label class="check">
    <input
      type="checkbox"
      checked={own.auto !== false}
      onchange={(e) => onchange({ ...own, auto: e.currentTarget.checked ? undefined : false })}
    />
    {t('factions.auto', { days: system.def.every })}<InfoTip markdown={t('factions.autoHelp')} />
  </label>
{/if}

<style>
  .cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .faction {
    padding: 4px 8px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .faction summary {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .faction[open] summary {
    margin-bottom: 6px;
  }

  .faction :global(.about) {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .who {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .swatch {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
  }

  .row,
  .check {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
