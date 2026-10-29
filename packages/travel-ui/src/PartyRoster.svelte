<script lang="ts">
  import {
    bringParty,
    keepParty,
    partyOf,
    partyTaking,
    rosterEntry,
    samePlace,
    type RosterPlace,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { characterUrl, roster, sheetText } from '@open-tabletop/character-ui'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * The party's own sheet and the roster: **From the roster** brings one of its parties (its
   * members with it), **Keep in the roster** keeps this one; while linked, a link to it.
   */
  let {
    system,
    session,
    locale,
    place,
    onedit,
  }: {
    system: TravelSystem & { partySheet: NonNullable<TravelSystem['partySheet']> }
    session: SessionState
    locale: string
    place: RosterPlace
    onedit: (update: (session: SessionState) => SessionState) => void
  } = $props()

  const t = translator(() => locale)
  const now = () => new Date().toISOString()

  /** The roster party this one is, while the roster says it plays here. */
  const linked = $derived.by(() => {
    const entry = session.partyRef ? rosterEntry(roster.roster, session.partyRef) : undefined
    return entry && samePlace(entry.playing, place) ? entry : undefined
  })
  /** The roster's parties of this sheet, but this one. */
  const available = $derived(
    roster.roster.characters.filter(
      (e) =>
        e.members &&
        e.character.sheet === system.partySheet.id &&
        e.character.id !== linked?.character.id,
    ),
  )

  async function bring(id: string) {
    if (!linked && !(await confirmAction(t('partySheet.replaceConfirm')))) return
    const taking = partyTaking(roster.roster, id, place)
    if (
      taking.length &&
      !(await confirmAction(
        t('partySheet.takeConfirm', {
          list: taking.map((x) => `${x.name} (${x.place})`).join(', '),
        }),
      ))
    )
      return
    onedit((s) => {
      const brought = bringParty(roster.roster, s, id, place, partyOf(system), now())
      roster.set(brought.roster)
      return brought.session
    })
  }

  function keep() {
    const name =
      session.party?.name || sheetText(system.partySheet.def.name, locale) || t('partySheet.title')
    onedit((s) => {
      const kept = keepParty(roster.roster, s, name, place, now())
      roster.set(kept.roster)
      return kept.session
    })
  }
</script>

<div class="roster">
  {#if linked}
    <span>{t('partySheet.linked', { name: linked.character.name || linked.character.id })}</span>
    <a href={characterUrl(linked.character.id)} target="_blank" rel="noopener"
      >{t('partySheet.open')} ↗</a
    >
  {:else}
    <button class="link" use:tooltip={t('partySheet.keepTip')} onclick={keep}
      >{t('partySheet.keep')}</button
    >
  {/if}
  {#if available.length}
    <label class="from">
      <span>{t('partySheet.fromRoster')}<InfoTip markdown={t('partySheet.fromRosterHelp')} /></span>
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

<style>
  .roster {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: end;
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
    color: var(--text-muted);
  }
</style>
