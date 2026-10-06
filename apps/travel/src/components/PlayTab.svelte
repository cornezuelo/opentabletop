<script lang="ts">
  import { confirmAction } from '@open-tabletop/ui-kit'
  import { packTexts } from '@open-tabletop/oracle-ui'
  import type { Season, TravelSystem } from '@open-tabletop/session'
  import { TripPanel, TripSetup } from '@open-tabletop/travel-ui'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'
  import { terrainName } from '../lib/terrains'
  import { trip } from '../lib/trip.svelte'
  import WayEditor from './WayEditor.svelte'

  /** Play a trip without a map with one system: the way on the left, the trip on the right. */
  let { system }: { system: TravelSystem } = $props()

  const texts = packTexts(() => library.registry, getLocale)
  const session = $derived(trip.saved.session)
  const playing = $derived(!!session && trip.saved.system === system.id)
  const name = (s: TravelSystem) => (s.id === 'generic' ? t('nav.generic') : s.name)
  let season = $state<Season>(trip.saved.season)

  async function start(id: string, s: Season) {
    const target = systems.get(id) ?? system
    // Only a trip with something in its journal has anything to lose.
    if (
      session?.journal.length &&
      !(await confirmAction(t('play.switchConfirm', { system: name(target) })))
    )
      return
    trip.start(target.id, s)
    if (target.id !== system.id) go({ name: 'system', id: target.id, tab: 'play' })
  }

  const hexLabel = (hex: string) => {
    const h = trip.saved.way[Number(hex)]
    return `${t('play.hex', { n: Number(hex) + 1 })}${h ? ` (${terrainName(h.terrain)})` : ''}`
  }
</script>

<div class="room">
  <div class="play">
    <section class="left">
      <TripSetup
        systems={systems.list}
        system={system.id}
        locale={getLocale()}
        bind:season
        onrestart={start}
      />
      {#if !playing && session}
        <div class="notice">
          <span>{t('play.current', { system: name(trip.system) })}</span>
          <button onclick={() => start(system.id, season)}
            >{t('play.switch', { system: name(system) })}</button
          >
        </div>
      {/if}
      <WayEditor {system} />
    </section>
    <section class="right">
      {#if playing && session}
        <TripPanel
          {system}
          {session}
          startDay={trip.saved.startDay}
          locale={getLocale()}
          {hexLabel}
          nameOf={texts.nameOf}
          destinationHint={t('play.destinationHint')}
          arrivedHint={t('play.arrivedHint')}
          onstep={(action) => trip.step(action)}
          onedit={(update) => trip.edit(update)}
        />
      {:else if !session}
        <button class="primary" onclick={() => start(system.id, season)}
          >{t('play.switch', { system: name(system) })}</button
        >
      {/if}
    </section>
  </div>
</div>

<style>
  /* Stacks by the room it has, not the window: the manual column can take half of it. */
  .room {
    container-type: inline-size;
  }

  .play {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
    gap: 24px;
    align-items: start;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .notice {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  .notice button,
  .primary {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .primary {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  @container (max-width: 760px) {
    .play {
      grid-template-columns: 1fr;
    }
  }
</style>
