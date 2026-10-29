<script lang="ts">
  import type { Calendar } from '@open-tabletop/time'
  import type { WorldState } from '@open-tabletop/world-engine'
  import { ClockDial } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { shortTime } from './when'

  /**
   * The world clock at a glance, read-only: the events coming next, or the progress clocks,
   * for a page that sums the campaign up (the Campaign app's Overview). The World tab
   * changes them.
   */
  let {
    locale,
    world,
    calendar,
    part,
    limit = 4,
  }: {
    locale: string
    world: WorldState
    calendar: Calendar
    /** `events`: those coming next, soonest first; `clocks`: the progress clocks. */
    part: 'events' | 'clocks'
    /** How many events it shows. */
    limit?: number
  } = $props()

  const t = translator(() => locale)
  const next = $derived(
    world.events
      .filter((e) => e.at >= world.time)
      .sort((a, b) => a.at - b.at)
      .slice(0, limit),
  )
</script>

{#if part === 'events'}
  {#if next.length}
    <ul class="events">
      {#each next as e (e.id)}
        <li><span class="when">{shortTime(calendar, e.at, locale)}</span> {e.name}</li>
      {/each}
    </ul>
  {:else}
    <p class="none">{t('world.noEvents')}</p>
  {/if}
{:else if world.clocks.length}
  <ul class="clocks">
    {#each world.clocks as k (k.id)}
      <li>
        <ClockDial segments={k.segments} filled={k.filled} size={28} label={k.name} />
        <span>{k.name}</span>
        <span class="count">{k.filled}/{k.segments}</span>
      </li>
    {/each}
  </ul>
{:else}
  <p class="none">{t('world.noClocks')}</p>
{/if}

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }

  .when {
    color: var(--text-muted);
  }

  .clocks li {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .count {
    margin-left: auto;
    color: var(--text-muted);
  }

  .none {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
