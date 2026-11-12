<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { roster } from '@open-tabletop/character-ui'
  import type { TravelSystem, Use } from '@open-tabletop/session'
  import { busy, confirmAction, InfoTip } from '@open-tabletop/ui-kit'
  import { untrack } from 'svelte'
  import { translator } from './i18n'
  import { terrainName } from './terrains'
  import TripPanel from './TripPanel.svelte'
  import { sceneSystem, type Saved, type TripStore } from './trips.svelte'
  import { wayWorld } from './way'

  /**
   * A campaign's scenes (fights without a trip, docs/conflicts.md): a trip standing at one
   * place, with the campaign's cast and those present, played with the trip's panel (the
   * fight panel in it). One opens, a new one takes the cast, ending one gives it back.
   */
  let {
    scenes,
    campaign,
    systems,
    locale,
    open,
    nameOf,
    uses = [],
    onopen,
  }: {
    /** The scenes kept (a `TripStore` of scenes, sharing the host's campaign keeper). */
    scenes: TripStore
    campaign: Campaign
    systems: TravelSystem[]
    locale: string
    /** The scene asked for (its id), if any: else the newest. */
    open?: string
    /** A definition's name in the UI's language (`@kind/id` → name), for the journal. */
    nameOf?: (ref: string) => string
    /** Where the system's names are used (session's `systemUses`), for the panel's help. */
    uses?: Use[]
    /** A scene was opened or made (its id), or none is open: the host's address follows. */
    onopen: (id: string | undefined) => void
  } = $props()

  const t = translator(() => locale)
  const list = $derived(scenes.tripsIn(campaign.id))
  /** The scene shown: the one asked for, else the open one if it's this campaign's, else the newest. */
  const shown = $derived<Saved | undefined>(
    list.find((s) => s.id === open) ?? list.find((s) => s.id === scenes.saved.id) ?? list.at(-1),
  )
  // The store opens the scene shown, so its steps play that one.
  $effect(() => {
    const id = shown?.id
    if (id && id !== untrack(() => scenes.saved.id)) untrack(() => scenes.open(id))
  })
  const playing = $derived(
    !!shown && shown.id === scenes.saved.id && !!scenes.saved.session && !!scenes.campaign,
  )
  const system = $derived(scenes.system)
  const sceneLabel = (s: Saved) => s.name || t('scenes.unnamed', { n: list.indexOf(s) + 1 })

  // The roster changed (the Characters app, another tab): the scene's characters catch up.
  $effect(() => {
    void roster.roster
    untrack(() => scenes.pullRoster())
  })

  /** A scene being made (its button turns until it's going). */
  let making = $state(false)
  async function create() {
    making = true
    try {
      await scenes.createScene(
        sceneSystem(campaign, systems),
        campaign.id,
        t('scenes.unnamed', { n: list.length + 1 }),
      )
      onopen(scenes.saved.id)
    } finally {
      making = false
    }
  }

  async function end() {
    if (!shown) return
    if (!(await confirmAction(t('scenes.endConfirm', { scene: sceneLabel(shown) })))) return
    scenes.remove()
    onopen(undefined)
  }
</script>

<div class="scenes">
  <div class="bar">
    {#if list.length}
      <label class="field">
        <span>{t('scenes.title')}<InfoTip markdown={t('scenes.help')} /></span>
        <select value={shown?.id} onchange={(e) => onopen(e.currentTarget.value)}>
          {#each list as s (s.id)}<option value={s.id}>{sceneLabel(s)}</option>{/each}
        </select>
      </label>
      {#if shown}
        <label class="field">
          <span>{t('trips.name')}</span>
          <input
            type="text"
            value={shown.name}
            onchange={(e) => scenes.rename(e.currentTarget.value)}
          />
        </label>
      {/if}
    {:else}
      <p class="help">{t('scenes.none')}<InfoTip markdown={t('scenes.help')} /></p>
    {/if}
    <button class="primary" use:busy={making} onclick={create}>{t('scenes.new')}</button>
    {#if shown}<button class="danger" onclick={end}>{t('scenes.end')}</button>{/if}
  </div>
  {#if playing && scenes.saved.session}
    <TripPanel
      {system}
      session={scenes.saved.session}
      startDay={scenes.saved.startDay}
      {locale}
      hexLabel={() => (shown ? sceneLabel(shown) : '')}
      terrainName={(id) => terrainName(t, id, { system, locale })}
      world={wayWorld(scenes.saved.way, scenes.cellKm)}
      title={shown ? sceneLabel(shown) : ''}
      {nameOf}
      scene
      onstep={(action) => scenes.step(action)}
      place={scenes.place}
      systemWhere={t('scenes.systemWhere')}
      {uses}
      onedit={(update) => scenes.edit(update)}
      onshare={(moved) => scenes.share(moved)}
      worldWaiting={scenes.worldWaiting()}
      onworld={(choice) => scenes.answerWorld(choice)}
    />
  {/if}
</div>

<style>
  .scenes {
    --trip-pin-bg: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 640px;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  button {
    padding: 6px 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button.primary {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  button.danger {
    color: var(--danger-text);
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
