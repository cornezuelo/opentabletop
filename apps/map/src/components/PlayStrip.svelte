<script lang="ts">
  import { travels } from '@open-tabletop/session'
  import { pacing, TripStatus } from '@open-tabletop/travel-ui'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { placeLabel } from '../lib/io/submaps'
  import { showToast } from '@open-tabletop/ui-kit'
  import { destinationHelp, playPanelShown, sessionOf, showPlayPanel, step } from '../lib/play/play'
  import { oracleUi } from '../lib/play/oracle'
  import { worldFactsNow } from '../lib/play/world.svelte'
  import { terrainLabel } from '../lib/terrainName'
  import { activeSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /** Over the map, in Play: where the trip stands and what happened last, so the panel keeps its height for what to do. */
  const play = $derived(editor.play)
  /** A march told a place at a time is shown as it's told (travel-ui's `pacing`). */
  const toldSession = (s: ReturnType<typeof sessionOf>) => s && pacing.view(s)
  const session = $derived(play ? toldSession(sessionOf(play)) : null)
  const system = $derived(activeSystem())
  const coord = (key: string) => {
    void editor.grid
    return placeLabel(key)
  }

  /** What the trip waits for now (a check, a step's pause): one toast when it starts, out of the panel's sight. */
  const waitingFor = $derived(
    session?.travel.pendingChecks[0]?.id ??
      (session?.travel.waiting ? `held:${session.travel.waiting.time}` : ''),
  )
  let toldOf = ''
  $effect(() => {
    if (waitingFor && waitingFor !== toldOf && !playPanelShown())
      showToast(t('play.paused'), 'info', 8000)
    toldOf = waitingFor
  })
</script>

{#if editor.mode === 'play' && play?.mode === 'rules' && play.rules && session && travels(system)}
  <div class="strip">
    <TripStatus
      strip
      {system}
      {session}
      startDay={play.rules.startDay}
      locale={getLocale()}
      hexLabel={coord}
      arrivedHint={destinationHelp(true)}
      latest
      onstep={step}
      onshow={showPlayPanel}
      terrainName={terrainLabel}
      nameOf={oracleUi.nameOf}
      facts={worldFactsNow()}
    />
  </div>
{/if}

<style>
  .strip {
    position: absolute;
    top: 8px;
    right: calc(28px + var(--map-covered, 0px));
    left: 28px;
    z-index: 2;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .strip > :global(*) {
    pointer-events: auto;
  }
</style>
