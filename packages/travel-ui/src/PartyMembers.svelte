<script lang="ts">
  import { usesOf, type Use } from '@open-tabletop/session'
  import { usesHelp } from './uses'
  import {
    localize,
    newMember,
    partyOf,
    isLinked,
    keepInRoster,
    refreshParty,
    renameMember,
    samePlace,
    takeFromRoster,
    type RosterPlace,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import { CharacterCard, characterUrl, roster, SheetOrigin } from '@open-tabletop/character-ui'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import type { Snippet } from 'svelte'
  import Section from './Section.svelte'
  import { translator } from './i18n'
  import { memberId, memberLabel } from './members'

  /**
   * The party's characters, when the system has a sheet for them: each one's sheet, who
   * is acting now, and adding or removing them. Every change brings the party up to date
   * (its stats made of theirs, the supplies they carry).
   */
  let {
    system,
    session,
    locale,
    names = (id) => id,
    targets = [],
    place,
    systemWhere = '',
    uses = [],
    nameOf = (id) => id,
    rolls,
    onedit,
  }: {
    system: TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> }
    session: SessionState
    locale: string
    /** What a condition blocks, in words (an action, travel, a way of travelling). */
    names?: (id: string) => string
    /** Places relations may point at, from the host (the map's places, regions…). */
    targets?: { ref: string; label: string }[]
    /** The trip as a place of the roster (absent: this host doesn't use the roster). */
    place?: RosterPlace
    /** Where the host's system is chosen (basic Markdown), for the help of whose sheet it is. */
    systemWhere?: string
    /** Where the system's names are used: a role's help says what reads its holder. */
    uses?: Use[]
    /** Display name of an Oracle definition (`pack/id`), for what reads a role. */
    nameOf?: (id: string) => string
    /** Who rolls for the party, from the host: under who acts. */
    rolls?: Snippet
    onedit: (update: (session: SessionState) => SessionState) => void
  } = $props()

  const t = translator(() => locale)
  /** What reads whoever holds a role (the tables, checks and actions). */
  const roleUses = (id: string) =>
    usesHelp(usesOf(uses, { kind: 'role', id }), system, locale, nameOf, t)
  const members = $derived(session.members ?? [])
  /** What relations may point at: the other characters, then the host's places. */
  const allTargets = $derived([
    ...members.map((m) => ({ ref: `character:${m.id}`, label: memberLabel(m) })),
    ...targets,
  ])
  /** The system's journey roles, by id, with their names. */
  const roles = $derived(
    Object.entries(system.bindings?.roles ?? {}).map(([id, role]) => ({
      id,
      name: localize(role.name, locale, system.locale) ?? id,
      description: localize(role.description, locale, system.locale) ?? '',
    })),
  )

  /** Changes the members, then the party follows them. */
  function edit(change: (s: SessionState) => void) {
    onedit((input) => {
      const s = structuredClone(input)
      change(s)
      if (!s.members?.length) delete s.members
      if (s.acting !== undefined && !s.members?.some((m) => m.id === s.acting)) delete s.acting
      // Roles of characters no longer in the party go with them.
      for (const [role, id] of Object.entries(s.roles ?? {}))
        if (!s.members?.some((m) => m.id === id)) delete s.roles![role]
      if (s.roles && !Object.keys(s.roles).length) delete s.roles
      refreshParty(s, partyOf(system))
      return s
    })
  }

  /** Roster characters of this sheet that could join: all but those already here. */
  const available = $derived(
    place
      ? roster.roster.characters.filter(
          (e) => e.character.sheet === system.sheet.id && !samePlace(e.playing, place),
        )
      : [],
  )
  const linked = (member: CharacterState) => !!place && isLinked(roster.roster, member.id, place)

  /** A roster character joins the party (taken from where it played, after asking). */
  async function join(id: string) {
    if (!place) return
    const entry = available.find((e) => e.character.id === id)
    if (!entry) return
    const name = memberLabel(entry.character)
    if (
      entry.playing &&
      !(await confirmAction(t('members.takeConfirm', { name, place: entry.playing.name })))
    )
      return
    const taken = takeFromRoster(roster.roster, id, place, new Date().toISOString())
    if (!taken) return
    roster.set(taken.roster)
    edit((s) => {
      // A character of the trip's own with that id makes room.
      if (s.members?.some((m) => m.id === id))
        renameMember(s, id, memberId(id, [...(s.members ?? []).map((m) => m.id), id]))
      s.members = [...(s.members ?? []), taken.character]
    })
  }

  /** A character of the trip kept in the roster, linked to this trip (a new id if taken). */
  function keep(member: CharacterState) {
    if (!place) return
    const kept = keepInRoster(roster.roster, member, new Date().toISOString(), place)
    roster.set(kept.roster)
    // Taken: the trip's copy follows the id the roster gave it.
    if (kept.id !== member.id) edit((s) => renameMember(s, member.id, kept.id))
  }

  function add() {
    const taken = members.map((m) => m.id)
    const id = memberId(t('members.newName'), taken)
    const member = newMember(partyOf(system), { id })
    edit((s) => (s.members = [...(s.members ?? []), member]))
  }

  /** A member still called character, character-2… takes its id from its name. */
  function change(old: CharacterState, next: CharacterState) {
    const fresh =
      /^(character|personaje)(-\d+)?$/.test(old.id) && next.name && next.name !== old.name
    const id = fresh
      ? memberId(
          next.name!,
          members.filter((m) => m.id !== old.id).map((m) => m.id),
        )
      : old.id
    edit((s) => {
      s.members = (s.members ?? []).map((m) => (m.id === old.id ? next : m))
      // Who acts, the roles, who rolls and relations to it follow its new id.
      renameMember(s, old.id, id)
    })
  }

  async function remove(member: CharacterState) {
    if (!(await confirmAction(t('members.confirmRemove', { name: memberLabel(member) })))) return
    edit((s) => (s.members = (s.members ?? []).filter((m) => m.id !== member.id)))
  }

  function move(member: CharacterState, by: number) {
    edit((s) => {
      const list = [...(s.members ?? [])]
      const i = list.findIndex((m) => m.id === member.id)
      const j = i + by
      if (i < 0 || j < 0 || j >= list.length) return
      ;[list[i], list[j]] = [list[j], list[i]]
      s.members = list
    })
  }
</script>

<Section title={t('members.title')} help={t('members.help')}>
  <!-- Who acts and who rolls, first in the section. -->
  {#if members.length}
    <label class="acting">
      <span>{t('members.acting')}<InfoTip markdown={t('members.actingHelp')} /></span>
      <select
        value={session.acting ?? ''}
        onchange={(e) => {
          const id = e.currentTarget.value
          edit((s) => {
            if (id) s.acting = id
            else delete s.acting
          })
        }}
      >
        <option value="">{t('members.nobody')}</option>
        {#each members as m (m.id)}<option value={m.id}>{memberLabel(m)}</option>{/each}
      </select>
    </label>
  {/if}
  {@render rolls?.()}
  <SheetOrigin sheet={system.sheet} {system} {locale} where={systemWhere} />
  {#if members.length && roles.length}
    <div class="roles">
      <h4 class="subhead">{t('members.roles')}<InfoTip markdown={t('members.rolesHelp')} /></h4>
      {#each roles as role (role.id)}
        <label class="role">
          <span
            >{role.name}{#if role.description || roleUses(role.id)}<InfoTip
                markdown={[role.description, roleUses(role.id)].filter(Boolean).join('\n\n')}
              />{/if}</span
          >
          <select
            value={session.roles?.[role.id] ?? ''}
            onchange={(e) => {
              const id = e.currentTarget.value
              edit((s) => {
                const next = { ...s.roles }
                if (id) next[role.id] = id
                else delete next[role.id]
                s.roles = next
              })
            }}
          >
            <option value="">{t('members.nobody')}</option>
            {#each members as m (m.id)}<option value={m.id}>{memberLabel(m)}</option>{/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}
  {#each members as member, i (member.id)}
    <details class="member" open={members.length === 1}>
      <summary>
        <strong>{memberLabel(member)}</strong>
        {#if session.acting === member.id}<em>{t('members.actingNow')}</em>{/if}
        <span class="tools">
          <button
            class="icon"
            aria-label={t('members.up')}
            use:tooltip={t('members.up')}
            disabled={i === 0}
            onclick={(e) => {
              e.preventDefault()
              move(member, -1)
            }}>↑</button
          >
          <button
            class="icon"
            aria-label={t('members.remove')}
            use:tooltip={t('members.remove')}
            onclick={(e) => {
              e.preventDefault()
              remove(member)
            }}>×</button
          >
        </span>
      </summary>
      {#if place}
        <p class="roster">
          {#if linked(member)}
            <a href={characterUrl(member.id)} target="_blank" rel="noopener"
              >{t('members.openInCharacters')} ↗</a
            >
          {:else}
            <button class="link" use:tooltip={t('members.keepTip')} onclick={() => keep(member)}
              >{t('members.keep')}</button
            >
          {/if}
        </p>
      {/if}
      <CharacterCard
        sheet={system.sheet.def}
        character={member}
        {locale}
        {names}
        time={session.travel.time}
        targets={allTargets}
        onchange={(next) => change(member, next)}
      />
    </details>
  {:else}
    <p class="help">{t('members.none')}</p>
  {/each}
  <div class="adding">
    <button class="add" onclick={add}>{t('members.add')}</button>
    {#if available.length}
      <label class="from">
        <span>{t('members.fromRoster')}<InfoTip markdown={t('members.fromRosterHelp')} /></span>
        <select
          value=""
          onchange={(e) => {
            const id = e.currentTarget.value
            e.currentTarget.value = ''
            if (id) void join(id)
          }}
        >
          <option value="">{t('members.choose')}</option>
          {#each available as e (e.character.id)}
            <option value={e.character.id}
              >{memberLabel(e.character)}{e.playing
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
  .roles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 4px 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .roles > .subhead {
    grid-column: 1 / -1;
  }

  .role {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .acting {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .member {
    padding: 4px 8px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .member summary {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .member summary em {
    font-size: 11px;
    font-style: normal;
    color: var(--accent);
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

  .adding {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: end;
  }

  .from {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .tools {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }

  .icon {
    padding: 0 5px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .icon:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .member[open] summary {
    margin-bottom: 6px;
  }

  .add {
    align-self: flex-start;
    padding: 4px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
