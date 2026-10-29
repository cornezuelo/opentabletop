<script lang="ts">
  import { characterUrl, roster } from '@open-tabletop/character-ui'
  import { partyWith, rosterEntry, type RosterEntry } from '@open-tabletop/session'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { setPartyMembers } from '../lib/actions'
  import { t } from '../lib/i18n'
  import type { CharacterSystem } from '../lib/packs.svelte'

  /**
   * A party's members: links to them and, while it plays nowhere, adding and taking them out
   * (a character is in one party at a time: moving one from another party asks first).
   */
  let { entry, system }: { entry: RosterEntry; system?: CharacterSystem } = $props()

  const id = $derived(entry.character.id)
  const members = $derived(
    (entry.members ?? []).flatMap((m) => {
      const e = rosterEntry(roster.roster, m)
      return e ? [e] : []
    }),
  )
  /** The roster characters of the system's characters' sheet not in this party. */
  const available = $derived(
    system
      ? roster.roster.characters.filter(
          (e) =>
            !e.members &&
            e.character.sheet === system.sheet.id &&
            !entry.members?.includes(e.character.id),
        )
      : [],
  )
  const label = (e: RosterEntry) => e.character.name || e.character.id

  async function add(member: string) {
    const other = partyWith(roster.roster, member)
    const e = rosterEntry(roster.roster, member)
    if (
      other &&
      e &&
      !(await confirmAction(t('party.moveConfirm', { name: label(e), party: label(other) }), {
        danger: false,
      }))
    )
      return
    setPartyMembers(id, [...(entry.members ?? []), member])
  }
</script>

<section class="members">
  <h2>{t('party.members')}<InfoTip markdown={t('party.membersHelp')} /></h2>
  {#if entry.playing}
    <p class="help">{t('party.playingNote', { place: entry.playing.name })}</p>
  {/if}
  {#each members as m (m.character.id)}
    <div class="member">
      <a href={characterUrl(m.character.id)}>{label(m)}</a>
      {#if !entry.playing}
        <button
          class="icon"
          aria-label={t('party.remove')}
          use:tooltip={t('party.remove')}
          onclick={() =>
            setPartyMembers(
              id,
              (entry.members ?? []).filter((x) => x !== m.character.id),
            )}>×</button
        >
      {/if}
    </div>
  {:else}
    <p class="help">{t('party.none')}</p>
  {/each}
  {#if !entry.playing && available.length}
    <select
      value=""
      aria-label={t('party.add')}
      onchange={(e) => {
        const member = e.currentTarget.value
        e.currentTarget.value = ''
        if (member) void add(member)
      }}
    >
      <option value="">{t('party.add')}…</option>
      {#each available as e (e.character.id)}
        {@const other = partyWith(roster.roster, e.character.id)}
        <option value={e.character.id}>{label(e)}{other ? ` (${label(other)})` : ''}</option>
      {/each}
    </select>
  {/if}
</section>

<style>
  .members {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 420px;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .member {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  a {
    color: var(--accent);
  }

  .icon {
    padding: 0 5px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  select {
    align-self: flex-start;
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
