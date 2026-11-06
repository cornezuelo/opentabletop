<script lang="ts">
  import { travels } from '@open-tabletop/session'
  import { TripStatus } from '@open-tabletop/travel-ui'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { placeLabel } from '../lib/io/submaps'
  import { sessionOf } from '../lib/play/play'
  import { activeSystem } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'

  /** Over the map, in Play: where the trip stands, so the panel keeps its height for what to do. */
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
      arrivedHint={t('play.newDestination')}
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
