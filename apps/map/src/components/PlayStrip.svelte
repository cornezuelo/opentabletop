<script lang="ts">
  import { travels } from '@open-tabletop/session'
  import { TripStatus } from '@open-tabletop/travel-ui'
  import { getLocale } from '../lib/i18n/index.svelte'
  import { placeLabel } from '../lib/io/submaps'
  import { destinationHelp, sessionOf } from '../lib/play/play'
  import { oracleUi } from '../lib/play/oracle'
  import { worldFactsNow } from '../lib/play/world.svelte'
  import { terrainLabel } from '../lib/terrainName'
  import { activeSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /** Over the map, in Play: where the trip stands and what happened last, so the panel keeps its height for what to do. */
  const play = $derived(editor.play)
  const session = $derived(play ? sessionOf(play) : null)
  const system = $derived(activeSystem())
  const coord = (key: string) => {
    void editor.grid
    return placeLabel(key)
  }
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
