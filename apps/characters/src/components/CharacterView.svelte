<script lang="ts">
  import { CharacterCard, placeUrl, roster, sheetText } from '@open-tabletop/character-ui'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import {
    campaignPlace,
    editInRoster,
    partyWith,
    putInCampaign,
    takenFromPlay,
    rosterEntry,
    systemName,
    tagsInUse,
    type RosterPlace,
  } from '@open-tabletop/session'
  import {
    APPS,
    appUrl,
    campaignUrl,
    confirmAction,
    InfoTip,
    Markdown,
    NoteRefInput,
    showToast,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { placeCampaign } from '@open-tabletop/travel-ui'
  import { listCampaigns } from '@open-tabletop/storage'
  import { deleteCharacter, duplicateCharacter, exportCharacters } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'
  import PartyMembersBox from './PartyMembersBox.svelte'
  import SplitParty from './SplitParty.svelte'

  /** One character of the roster: its card, its notes, where it plays, and what to do with it. */
  let { id }: { id: string } = $props()

  const entry = $derived(rosterEntry(roster.roster, id))
  const character = $derived(entry?.character)
  const found = $derived(character ? systems.sheetOf(character.sheet) : undefined)
  const system = $derived(found?.system)
  /** The Systems tab its sheet is edited in. */
  const sheetTab = $derived(
    !system || !character
      ? 'sheet'
      : character.sheet === system.sheet.id || character.sheet === system.partySheet?.id
        ? 'sheet'
        : character.sheet === system.factions?.sheet.id
          ? 'factions'
          : 'bestiary',
  )
  /** The template it's a copy of, named, if its bestiary is one of its system's. */
  const madeFrom = $derived.by(() => {
    const from = character?.template
    if (!from) return undefined
    const bestiary = system?.bestiary?.find((b) => b.id === from.from)
    const def = bestiary?.def.templates[from.id]
    return {
      ...from,
      name: sheetText(def?.name, getLocale()) ?? from.id,
      bestiaryName: bestiary && (sheetText(bestiary.def.name, getLocale()) ?? from.from),
    }
  })
  const label = $derived(character ? character.name || character.id : '')
  /** A party (its sheet and members), and the party a character is in. */
  const isParty = $derived(!!entry?.members)
  const party = $derived(isParty ? undefined : partyWith(roster.roster, id))
  let splitting = $state(false)
  /** The other roster characters, for its relations (`character:<id>`). */
  const targets = $derived(
    roster.roster.characters
      .filter((e) => e.character.id !== id)
      .map((e) => ({
        ref: `character:${e.character.id}`,
        label: e.character.name || e.character.id,
      })),
  )

  const now = () => new Date().toISOString()
  function edit(change: (e: NonNullable<typeof entry>) => NonNullable<typeof entry>) {
    roster.set(editInRoster(roster.roster, id, change, now()))
  }
  const setCharacter = (next: CharacterState) => edit((e) => ({ ...e, character: next }))
  function setNote(value: string) {
    edit((e) => {
      const next = { ...e }
      if (value.trim()) next.noteRef = value.trim()
      else delete next.noteRef
      return next
    })
  }

  const appName = (place: RosterPlace) => APPS.find((a) => a.id === place.app)?.name ?? place.app
  const placeText = (place: RosterPlace) =>
    place.app === 'campaign'
      ? t('character.inCampaignOnly', { campaign: place.name })
      : t(place.token ? 'character.playsAsToken' : 'character.playsIn', {
          place: place.name,
          app: appName(place),
        })

  /** The campaigns it can be in without a trip (a quick game). */
  let campaigns = $state<{ id: string; name: string }[]>([])
  $effect(() => {
    void listCampaigns()
      .then((list) => (campaigns = list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  })
  /** Puts it (a party, with its members) in a campaign without a trip, or in none. */
  async function setCampaign(campaign: string) {
    const taken = takenFromPlay(roster.roster, id)
    if (
      taken.length &&
      !(await confirmAction(
        t('character.leaveConfirm', {
          list: taken
            .map((e) => `${e.character.name || e.character.id} (${e.playing!.name})`)
            .join(', '),
        }),
      ))
    )
      return
    const found = campaigns.find((c) => c.id === campaign)
    roster.set(
      putInCampaign(
        roster.roster,
        id,
        found ? campaignPlace(found.id, found.name || t('character.untitledCampaign')) : undefined,
        now(),
      ),
    )
  }

  /** The campaign the place it plays in is in (read from the map library or Travel's trips). */
  let campaign = $state<{ id: string; name: string }>()
  $effect(() => {
    const place = entry?.playing
    campaign = undefined
    if (place) void placeCampaign(place).then((found) => (campaign = found))
  })

  function duplicate() {
    go({ name: 'character', id: duplicateCharacter(id, t('character.copyName', { name: label })) })
  }

  async function remove() {
    const place = entry?.playing
    const question = place
      ? t('character.confirmDeletePlaying', { name: label, place: placeText(place) })
      : t('character.confirmDelete', { name: label })
    if (!(await confirmAction(question))) return
    deleteCharacter(id)
    showToast(t('character.deleted', { name: label }))
    go({ name: 'welcome' }, true)
  }
</script>

{#if entry && character}
  <article class="character">
    <header>
      <h1 class="page-title">{label}</h1>
      <div class="buttons">
        <button
          use:tooltip={isParty ? t('party.duplicateTip') : t('character.duplicateTip')}
          onclick={duplicate}>{t('character.duplicate')}</button
        >
        {#if isParty && system?.partySheet && !entry.playing && entry.members?.length}
          <button use:tooltip={t('party.splitTip')} onclick={() => (splitting = true)}
            >{t('party.split')}</button
          >
        {/if}
        <button
          use:tooltip={t('character.exportTip')}
          onclick={() => exportCharacters([entry], label)}>{t('character.export')}</button
        >
        <button class="danger" onclick={remove}>{t('character.delete')}</button>
      </div>
    </header>

    <dl class="facts">
      <dt>{t('character.sheet')}<InfoTip markdown={t('character.sheetHelp')} /></dt>
      <dd>
        {#if found && system}
          {sheetText(found.def.name, getLocale()) ?? character.sheet} · {systemName(
            system,
            getLocale(),
          )}
          <a href="{appUrl('systems')}#/system/{encodeURIComponent(system.id)}/{sheetTab}"
            >{t('character.editSheet')}</a
          >
        {:else}
          <code>{character.sheet}</code>
        {/if}
      </dd>
      {#if madeFrom}
        <dt>{t('character.madeFrom')}<InfoTip markdown={t('character.madeFromHelp')} /></dt>
        <dd>
          {#if madeFrom.bestiaryName}
            {`${madeFrom.name} (${madeFrom.bestiaryName})`}
            <a
              href="#/bestiary"
              onclick={(e) => {
                e.preventDefault()
                go({ name: 'bestiary', bestiary: madeFrom.from, template: madeFrom.id })
              }}>{t('character.openTemplate')}</a
            >{:else}
            {madeFrom.name} <code>{madeFrom.from}</code>{/if}
        </dd>
      {/if}
      {#if party}
        <dt>{t('party.inParty')}<InfoTip markdown={t('party.inPartyHelp')} /></dt>
        <dd>
          <a
            class="plain"
            href="#/character/{encodeURIComponent(party.character.id)}"
            onclick={(e) => {
              e.preventDefault()
              go({ name: 'character', id: party.character.id })
            }}>{party.character.name || party.character.id}</a
          >
        </dd>
      {/if}
      <dt>{t('character.id')}<InfoTip markdown={t('character.idHelp', { id })} /></dt>
      <dd><code>{id}</code></dd>
      <dt>{t('character.where')}<InfoTip markdown={t('character.whereHelp')} /></dt>
      <dd>
        {#if entry.playing}
          {@const url = placeUrl(entry.playing)}
          {placeText(entry.playing)}
          {#if url}<a href={url}>{t('character.open')}</a>{/if}
          {#if campaign && entry.playing.app !== 'campaign'}<br />{t('character.inCampaign', {
              campaign: campaign.name || t('character.untitledCampaign'),
            })}
            <a href={campaignUrl(campaign.id)}>{t('character.openCampaign')}</a>{/if}
        {:else}
          <Markdown class="inline" text={isParty ? t('party.nowhere') : t('character.nowhere')} />
        {/if}
      </dd>
      {#if campaigns.length}
        <dt>{t('character.campaign')}<InfoTip markdown={t('character.campaignHelp')} /></dt>
        <dd>
          <select
            value={entry.playing?.app === 'campaign' ? entry.playing.id : ''}
            onchange={(e) => {
              const value = e.currentTarget.value
              e.currentTarget.value = entry.playing?.app === 'campaign' ? entry.playing.id : ''
              void setCampaign(value)
            }}
          >
            <option value="">{t('character.noCampaign')}</option>
            {#each campaigns as c (c.id)}
              <option value={c.id}>{c.name || t('character.untitledCampaign')}</option>
            {/each}
          </select>
        </dd>
      {/if}
    </dl>

    <label class="field">
      <span>{t('character.notes')}<InfoTip markdown={t('character.notesHelp')} /></span>
      <NoteRefInput
        value={entry.noteRef ?? ''}
        placeholder={t('character.notesPlaceholder', { name: label })}
        label={t('character.notes')}
        locale={getLocale()}
        onchange={setNote}
      />
    </label>

    {#if isParty}
      <PartyMembersBox {entry} {system} />
    {/if}

    {#if found && system}
      <CharacterCard
        sheet={found.def}
        {character}
        catalogues={system.items}
        tagChoices={tagsInUse(system, roster.roster)}
        locale={getLocale()}
        {targets}
        onchange={setCharacter}
      />
    {:else}
      <p class="help">{t('character.missingSheet', { sheet: character.sheet })}</p>
      <dl class="facts">
        {#each Object.entries(character.values) as [key, value] (key)}
          <dt>{key}</dt>
          <dd>{value}</dd>
        {/each}
      </dl>
    {/if}
  </article>
  {#if splitting && system}
    <SplitParty {entry} {system} onclose={() => (splitting = false)} />
  {/if}
{:else}
  <p class="help">{t('character.notFound')}</p>
{/if}

<style>
  .character {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    justify-content: space-between;
  }

  .buttons {
    display: flex;
    gap: 6px;
  }

  .buttons button {
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons .danger {
    color: var(--danger, #d9534f);
  }

  .facts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 14px;
    margin: 0;
    font-size: 13px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  dd a.plain {
    margin-left: 0;
  }

  dd a {
    margin-left: 6px;
    color: var(--accent);
  }

  .facts :global(.inline p) {
    margin: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 420px;
  }

  .help {
    color: var(--text-muted);
  }
</style>
