<script lang="ts">
  import { WorldClock, WorldTimeline, type WorldControls } from '@open-tabletop/campaign-ui'
  import { placeLabel } from '../lib/io/submaps'
  import { campaignUrl, Tabs } from '@open-tabletop/ui-kit'
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
    systemWorld,
    answerWorld,
    worldAct,
    worldCalendar,
    worldWaiting,
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
      hex: placeLabel((travelling ? trip.travel.destination : null) ?? trip.travel.location),
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
    answer: answerWorld,
  }
  const waiting = $derived.by(() => {
    void editor.waiting
    void editor.play
    return worldWaiting()
  })

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
<Tabs
  tabs={tabs.map((id) => ({ id, label: t(`world.tabs.${id}`) }))}
  value={tab}
  label={t('world.tabs.label')}
  prefix="world"
  onchange={(id) => worldTab.choose(id)}
/>
<div class="tabpanel" id="world-panel" role="tabpanel" aria-labelledby="world-tab-{tab}">
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
      worldRules={systemWorld()}
      {missing}
      defaultStart={start}
      part={tab}
      {waiting}
    />
  {/if}
</div>

<style>
  .open {
    align-self: flex-start;
    font-size: 12px;
    color: var(--accent);
  }

  .tabpanel {
    display: flex;
    flex-direction: column;
    padding-top: 10px;
  }
</style>
