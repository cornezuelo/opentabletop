<script lang="ts">
  import { WorldClock, type WorldControls } from '@open-tabletop/campaign-ui'
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { getLocale } from '../lib/i18n/index.svelte'
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
  import { editor } from '../lib/store/editor.svelte'

  /** The map's campaign's world clock (campaign-ui's), played on this map and its trip. */
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
</script>

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
/>
