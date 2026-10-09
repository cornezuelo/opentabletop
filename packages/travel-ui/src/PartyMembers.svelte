<script lang="ts">
  import {
    localize,
    newMember,
    partyOf,
    refreshParty,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import { CharacterCard } from '@open-tabletop/character-ui'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
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
    onedit,
  }: {
    system: TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> }
    session: SessionState
    locale: string
    /** What a condition blocks, in words (an action, travel, a way of travelling). */
    names?: (id: string) => string
    /** Places relations may point at, from the host (the map's places, regions…). */
    targets?: { ref: string; label: string }[]
    onedit: (update: (session: SessionState) => SessionState) => void
  } = $props()

  const t = translator(() => locale)
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
      s.members = (s.members ?? []).map((m) => (m.id === old.id ? { ...next, id } : m))
      if (s.acting === old.id) s.acting = id
      for (const [role, holder] of Object.entries(s.roles ?? {}))
        if (holder === old.id) s.roles![role] = id
      // Relations to this character follow its new id.
      if (id !== old.id)
        for (const m of s.members)
          for (const r of m.relations) if (r.to === `character:${old.id}`) r.to = `character:${id}`
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

<section class="members">
  <div class="head">
    <span>{t('members.title')}<InfoTip markdown={t('members.help')} /></span>
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
  </div>
  {#if members.length && roles.length}
    <div class="roles">
      <span>{t('members.roles')}<InfoTip markdown={t('members.rolesHelp')} /></span>
      {#each roles as role (role.id)}
        <label class="role">
          <span
            >{role.name}{#if role.description}<InfoTip markdown={role.description} />{/if}</span
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
  <button class="add" onclick={add}>{t('members.add')}</button>
</section>

<style>
  .members {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .roles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 4px 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .roles > span {
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
