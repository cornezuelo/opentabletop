<script lang="ts">
  import {
    addHandEntries,
    addPresent,
    changePresent,
    isLinked,
    keepInRoster,
    partyOf,
    presentHere,
    removePresent,
    rosterCreatures,
    systemSheets,
    tagsInUse,
    takeFromRoster,
    type PresentEvent,
    type RosterPlace,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import { CharacterCard, characterUrl, roster } from '@open-tabletop/character-ui'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import type { Snippet } from 'svelte'
  import Section from './Section.svelte'
  import { translator } from './i18n'
  import { byTemplate, copyLine, templateChoices, templateName } from './present'
  import { tripTab } from './tripTab.svelte'

  /**
   * Those present: the copies of the system's templates the trip made (an encounter's
   * wolves, a bandit chief), the ones at the party's place as folded cards grouped by
   * template, edited by hand like the party's characters; those left behind elsewhere,
   * counted under them. A copy can be added from the bestiary, brought from the roster (a
   * creature or NPC made in the Characters app), taken off, or kept in the roster. One
   * asked for (`showPresent`: its token clicked on a map) unfolds and is scrolled to.
   */
  let {
    system,
    session,
    locale,
    names = (id) => id,
    placeName = (at) => at,
    at,
    place,
    before,
    onedit,
  }: {
    system: TravelSystem
    session: SessionState
    locale: string
    /** What a condition blocks, in words. */
    names?: (id: string) => string
    /** A place of the trip in words (a hex's name, the way's stop). */
    placeName?: (at: string) => string
    /**
     * The place shown (a hex the host selected); absent: the party's. Elsewhere than the
     * party, only the copies there: nothing is added, and none are counted as left behind.
     */
    at?: string
    /** The trip as a place of the roster (absent: this host doesn't use the roster). */
    place?: RosterPlace
    /** What the host shows first in the section (what else stands on a hex: the party, tokens). */
    before?: Snippet
    onedit: (update: (session: SessionState) => SessionState) => void
  } = $props()

  const t = translator(() => locale)
  const choices = $derived(templateChoices(system, locale))
  /** Whether this is the party's place (the default): copies can be added, and others are behind. */
  const party = $derived(at === undefined || at === session.travel.location)
  const here = $derived(
    party ? presentHere(session) : (session.present ?? []).filter((p) => p.at === at),
  )
  const groups = $derived(byTemplate(here))
  const behind = $derived(
    party ? (session.present ?? []).filter((p) => p.at !== session.travel.location) : [],
  )
  const sheets = $derived(systemSheets(system))
  const sheetOf = (c: CharacterState) => sheets[c.sheet]
  /** Roster characters that could be here (a creature, an NPC), when this is the party's place. */
  const available = $derived(place && party ? rosterCreatures(system, roster.roster, place) : [])
  const linked = (c: CharacterState) => !!place && isLinked(roster.roster, c.id, place)

  let box = $state<HTMLElement>()
  // One of those asked for: its card and those around it unfolded, and scrolled to.
  $effect(() => {
    const shown = tripTab.shown
    if (!shown || !box) return
    const card = box.querySelector<HTMLDetailsElement>(
      `details[data-copy="${CSS.escape(shown.id)}"]`,
    )
    if (!card) return
    for (let d: HTMLElement | null = card; d && d !== box; d = d.parentElement)
      if (d instanceof HTMLDetailsElement) d.open = true
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })

  /** Changes those present, and says in the journal who came or left. */
  function edit(change: (s: SessionState) => PresentEvent[] | void) {
    onedit((input) => {
      let s = structuredClone(input)
      s = addHandEntries(s, change(s) ?? [])
      if (!s.present?.length) delete s.present
      return s
    })
  }

  function add(id: string) {
    edit((s) => changePresent(s, partyOf(system), id, 1))
  }

  async function remove(c: CharacterState) {
    if (!(await confirmAction(t('present.confirmRemove', { name: c.name ?? c.id })))) return
    edit((s) => removePresent(s, c.id))
  }

  function change(c: CharacterState, next: CharacterState) {
    edit((s) => {
      s.present = (s.present ?? []).map((p) =>
        p.character.id === c.id ? { ...p, character: next } : p,
      )
    })
  }

  /**
   * A roster character comes to the party's place, linked to this trip (taken from where it
   * played, after asking).
   */
  async function bring(id: string) {
    if (!place) return
    const entry = available.find((e) => e.character.id === id)
    if (!entry) return
    const name = entry.character.name || entry.character.id
    if (
      entry.playing &&
      !(await confirmAction(t('members.takeConfirm', { name, place: entry.playing.name })))
    )
      return
    const taken = takeFromRoster(roster.roster, id, place, new Date().toISOString())
    if (!taken) return
    roster.set(taken.roster)
    const character = taken.character
    edit((s) => addPresent(s, character))
  }

  /** A copy kept in the roster, linked to this trip (a new id if its own is taken there). */
  function keep(c: CharacterState) {
    if (!place) return
    const kept = keepInRoster(roster.roster, c, new Date().toISOString(), place)
    roster.set(kept.roster)
    if (kept.id !== c.id)
      edit((s) => {
        s.present = (s.present ?? []).map((p) =>
          p.character.id === c.id ? { ...p, character: { ...p.character, id: kept.id } } : p,
        )
      })
  }
</script>

{#snippet copy(p: (typeof here)[number], open: boolean, where = false)}
  {@const c = p.character}
  {@const sheet = sheetOf(c)}
  <details class="copy" data-copy={c.id} {open}>
    <summary>
      <strong>{c.name ?? c.id}</strong>
      <span class="line">{where ? placeName(p.at) : copyLine(c, sheet, locale)}</span>
      <span class="tools">
        <button
          class="icon"
          aria-label={t('present.remove')}
          use:tooltip={t('present.remove')}
          onclick={(e) => {
            e.preventDefault()
            void remove(c)
          }}>×</button
        >
      </span>
    </summary>
    {#if place}
      <p class="roster">
        {#if linked(c)}
          <a href={characterUrl(c.id)} target="_blank" rel="noopener"
            >{t('members.openInCharacters')} ↗</a
          >
        {:else}
          <button class="link" use:tooltip={t('present.keepTip')} onclick={() => keep(c)}
            >{t('members.keep')}</button
          >
        {/if}
      </p>
    {/if}
    {#if sheet}
      <CharacterCard
        {sheet}
        character={c}
        catalogues={system.items}
        tagChoices={tagsInUse(system, roster.roster, [
          ...(session.members ?? []),
          ...(session.present ?? []).map((p) => p.character),
        ])}
        {locale}
        {names}
        time={session.travel.time}
        onchange={(next) => change(c, next)}
      />
    {/if}
  </details>
{/snippet}

<Section title={t('present.title')} help={t('present.help')}>
  <div class="present" bind:this={box}>
    {@render before?.()}
    {#each groups as group (group.template)}
      {#if group.copies.length === 1}
        {@render copy(group.copies[0], false)}
      {:else}
        <details class="group">
          <summary>
            <strong>{templateName(choices, group.template)}</strong>
            <span class="count">×{group.copies.length}</span>
          </summary>
          {#each group.copies as p (p.character.id)}{@render copy(p, false)}{/each}
        </details>
      {/if}
    {:else}
      {#if !before}<p class="help">{t('present.none')}</p>{/if}
    {/each}
    {#if behind.length}
      <details class="behind">
        <summary
          >{t('present.behind', { count: behind.length })}<InfoTip
            markdown={t('present.behindHelp')}
          /></summary
        >
        <div class="cards">
          {#each behind as p (p.character.id)}{@render copy(p, false, true)}{/each}
        </div>
      </details>
    {/if}
    {#if party && choices.length}
      <label class="from">
        <span>{t('present.add')}<InfoTip markdown={t('present.addHelp')} /></span>
        <select
          value=""
          onchange={(e) => {
            const id = e.currentTarget.value
            e.currentTarget.value = ''
            if (id) add(id)
          }}
        >
          <option value="">{t('members.choose')}</option>
          {#each choices as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
    {/if}
    {#if available.length}
      <label class="from">
        <span>{t('present.fromRoster')}<InfoTip markdown={t('present.fromRosterHelp')} /></span>
        <select
          value=""
          onchange={(e) => {
            const id = e.currentTarget.value
            e.currentTarget.value = ''
            if (id) void bring(id)
          }}
        >
          <option value="">{t('members.choose')}</option>
          {#each available as e (e.character.id)}
            <option value={e.character.id}
              >{e.character.name || e.character.id}{e.playing
                ? ` (${t('members.playsIn', { place: e.playing.name })})`
                : ''}</option
            >
          {/each}
        </select>
      </label>
    {/if}
  </div>
</Section>

<style>
  .copy,
  .group {
    padding: 4px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .group > .copy {
    margin-left: 8px;
  }

  summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
    cursor: pointer;
  }

  .copy[open] > summary {
    margin-bottom: 6px;
  }

  .line,
  .count {
    font-size: 12px;
    color: var(--text-muted);
  }

  .tools {
    margin-left: auto;
  }

  .icon {
    padding: 0 5px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .present {
    display: contents;
  }

  .behind > summary {
    font-size: 12px;
    color: var(--text-muted);
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }

  .roster {
    margin: 4px 0;
    font-size: 12px;
  }

  .roster a,
  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .from {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
