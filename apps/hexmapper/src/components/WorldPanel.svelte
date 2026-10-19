<script lang="ts">
  import { WorldClock, WorldTimeline, type WorldControls } from '@open-tabletop/campaign-ui'
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { campaignUrl } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { sessionOf } from '../lib/play/play'
  import { activeSystem } from '../lib/play/systems'
  import {
    advanceWorld,
    bringClocks,
    defaultStart,
    missingClocks,
    setWorldDate,
    startWorld,
    stopWorld,
    systemClocks,
    worldAct,
    worldCalendar,
    worldWeatherNow,
  } from '../lib/play/world.svelte'
  import { worldTab, type WorldTab } from '../lib/play/worldTab.svelte'
  import { editor } from '../lib/store/editor.svelte'
  import FactionsPanel from './FactionsPanel.svelte'

  /**
   * The map's campaign's world clock (campaign-ui's), played on this map and its trip, and
   * its factions, a tab at a time (the one chosen is remembered per viewer).
   */
  const world = $derived(editor.world)
  const calendar = $derived.by(() => {
    void editor.play
    return worldCalendar()
  })
  const trip = $derived(editor.play ? sessionOf(editor.play) : null)
  /**
   * With a route planned, moving time on travels along it (as the system goes on by itself,
   * `travel.onward`; a system without one only waits).
   */
  const travelling = $derived(
    (trip?.travel.route?.length ?? 0) > 1 && !!activeSystem().rules.travel.onward,
  )
  const tripNow = $derived(
    trip && {
      travelling,
      hex: formatCoord(
        parseKey(((travelling ? trip.travel.destination : null) ?? trip.travel.location) as HexKey),
        editor.grid.coordFormat,
        editor.grid,
      ),
    },
  )
  const weather = $derived.by(() => {
    void world
    void editor.play
    return worldWeatherNow()
  })
  const missing = $derived.by(() => {
    void world
    void editor.meta
    return missingClocks().length
  })
  const start = $derived.by(() => {
    void editor.play
    return defaultStart()
  })
  const controls: WorldControls = {
    start: startWorld,
    stop: stopWorld,
    act: (action) => void worldAct(action),
    advance: advanceWorld,
    setDate: setWorldDate,
    bringClocks,
  }

  /** Before the clock starts, only starting it and the factions. */
  const tabs = $derived<WorldTab[]>(
    world ? ['now', 'events', 'clocks', 'timeline', 'factions'] : ['now', 'factions'],
  )
  const tab = $derived(worldTab.chosen && tabs.includes(worldTab.chosen) ? worldTab.chosen : 'now')
</script>

<a
  class="open"
  href={campaignUrl(
    editor.campaign.id,
    tab === 'factions' ? 'factions' : tab === 'timeline' ? 'timeline' : 'world',
  )}>{t('world.openCampaign')}</a
>
<div class="tabs" role="tablist" aria-label={t('world.tabs.label')}>
  {#each tabs as id (id)}
    <button
      role="tab"
      id="world-tab-{id}"
      aria-selected={tab === id}
      aria-controls="world-tabpanel"
      class:on={tab === id}
      onclick={() => worldTab.choose(id)}>{t(`world.tabs.${id}`)}</button
    >
  {/each}
</div>
<div class="tabpanel" id="world-tabpanel" role="tabpanel" aria-labelledby="world-tab-{tab}">
  {#if tab === 'factions'}
    <FactionsPanel />
  {:else if tab === 'timeline'}
    {#if world}<WorldTimeline locale={getLocale()} {world} {calendar} {controls} />{/if}
  {:else}
    <WorldClock
      locale={getLocale()}
      {world}
      {calendar}
      {controls}
      trip={tripNow}
      {weather}
      clocks={systemClocks()}
      {missing}
      defaultStart={start}
      part={tab}
    />
  {/if}
</div>

<style>
  .open {
    align-self: flex-start;
    font-size: 12px;
    color: var(--accent);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    align-items: end;
    border-bottom: 1px solid var(--panel-border);
  }

  .tabs [role='tab'] {
    margin-bottom: -1px;
    padding: 5px 10px;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
  }

  .tabs [role='tab'].on {
    color: var(--accent);
    background: var(--bg);
    border-color: var(--panel-border);
    border-bottom-color: var(--bg);
  }

  .tabpanel {
    display: flex;
    flex-direction: column;
    padding-top: 10px;
  }
</style>
