<script lang="ts">
  import { CharacterCard, placeUrl, roster, sheetText } from '@open-tabletop/character-ui'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import { editInRoster, rosterEntry, systemName, type RosterPlace } from '@open-tabletop/session'
  import {
    APPS,
    appUrl,
    confirmAction,
    InfoTip,
    Markdown,
    NoteRefInput,
    showToast,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { deleteCharacter, duplicateCharacter, exportCharacters } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** One character of the roster: its card, its notes, where it plays, and what to do with it. */
  let { id }: { id: string } = $props()

  const entry = $derived(rosterEntry(roster.roster, id))
  const character = $derived(entry?.character)
  const system = $derived(character ? systems.ofSheet(character.sheet) : undefined)
  const label = $derived(character ? character.name || character.id : '')
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
    t(place.token ? 'character.playsAsToken' : 'character.playsIn', {
      place: place.name,
      app: appName(place),
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
      <h1>{label}</h1>
      <div class="buttons">
        <button use:tooltip={t('character.duplicateTip')} onclick={duplicate}
          >{t('character.duplicate')}</button
        >
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
        {#if system}
          {sheetText(system.sheet.def.name, getLocale()) ?? character.sheet} · {systemName(
            system,
            getLocale(),
          )}
          <a href="{appUrl('systems')}#/system/{encodeURIComponent(system.id)}/sheet"
            >{t('character.editSheet')}</a
          >
        {:else}
          <code>{character.sheet}</code>
        {/if}
      </dd>
      <dt>{t('character.id')}<InfoTip markdown={t('character.idHelp', { id })} /></dt>
      <dd><code>{id}</code></dd>
      <dt>{t('character.where')}<InfoTip markdown={t('character.whereHelp')} /></dt>
      <dd>
        {#if entry.playing}
          {@const url = placeUrl(entry.playing)}
          {placeText(entry.playing)}
          {#if url}<a href={url}>{t('character.open')}</a>{/if}
        {:else}
          <Markdown class="inline" text={t('character.nowhere')} />
        {/if}
      </dd>
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

    {#if system}
      <CharacterCard
        sheet={system.sheet.def}
        {character}
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

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-weight: normal;
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
