<script lang="ts">
  import { CharacterGlance, sheetText } from '@open-tabletop/character-ui'
  import { PARTY_ID, type SessionState, type TravelSystem } from '@open-tabletop/session'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { mainChanges } from './glance'
  import { translator } from './i18n'
  import { memberLabel } from './members'
  import { showInParty } from './tripTab.svelte'

  /**
   * The party at a glance, under what it can do: its own sheet (if the system has one) and
   * each of its characters as a small card, its main value drawn as the sheet says, what the
   * last step did to it and the conditions it has; who acts outlined. A card clicked shows
   * the whole sheet in the Party tab.
   */
  let {
    system,
    session,
    locale,
  }: {
    system: TravelSystem
    session: SessionState
    locale: string
  } = $props()

  const t = translator(() => locale)
  const ones = $derived([
    ...(system.partySheet && session.party
      ? [
          {
            id: PARTY_ID,
            // Its own name, else its sheet's (the Company), else the party.
            name:
              session.party.name ||
              sheetText(system.partySheet.def.name, locale) ||
              t('partySheet.title'),
            character: session.party,
            sheet: system.partySheet.def,
          },
        ]
      : []),
    ...(system.sheet
      ? (session.members ?? []).map((m) => ({
          id: m.id,
          name: memberLabel(m),
          character: m,
          sheet: system.sheet!.def,
        }))
      : []),
  ])
  const changes = $derived(mainChanges(session, ones))
</script>

{#if ones.length}
  <ul class="glances" aria-label={t('glance.title')}>
    {#each ones as one (one.id)}
      <li>
        <button
          class:acting={session.acting === one.id}
          use:tooltip={t('glance.show', { name: one.name })}
          onclick={() => showInParty(one.id)}
        >
          <CharacterGlance
            sheet={one.sheet}
            character={one.character}
            name={one.name}
            change={changes[one.id] ?? 0}
            {locale}
          />
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .glances {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 4px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  button {
    width: 100%;
    height: 100%;
    padding: 4px 6px;
    font-size: 12px;
    color: inherit;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--accent);
  }

  button.acting {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
</style>
