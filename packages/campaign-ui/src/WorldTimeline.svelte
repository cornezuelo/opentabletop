<script lang="ts">
  import type { Calendar, GameTime } from '@open-tabletop/time'
  import { newestFirst, type WorldState } from '@open-tabletop/world-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { timelineText } from './timeline'
  import type { WorldControls } from './controls'
  import { shortTime } from './when'

  /**
   * The world clock's timeline: what happened, newest first (events come due, holidays,
   * moons, full clocks, world turns, notes), and a note of your own.
   */
  let {
    locale,
    world,
    calendar,
    controls,
    limit = 40,
    scroll = true,
  }: {
    locale: string
    world: WorldState
    calendar: Calendar
    controls: WorldControls
    /** How many lines it shows, newest first. */
    limit?: number
    /** Whether the list scrolls in a short box (a side panel) or grows (a page of its own). */
    scroll?: boolean
  } = $props()

  const t = translator(() => locale)
  const short = (time: GameTime) => shortTime(calendar, time, locale)

  let note = $state('')
</script>

<div class="field">
  <span>{t('world.timeline')}<InfoTip text={t('world.timelineHelp')} /></span>
  <form
    class="row"
    onsubmit={(e) => {
      e.preventDefault()
      controls.act({ type: 'note', text: note })
      note = ''
    }}
  >
    <input type="text" bind:value={note} placeholder={t('world.note')} />
    <button type="submit" disabled={!note.trim()}>{t('world.addNote')}</button>
  </form>
  <ol class="list" class:timeline={scroll}>
    {#each newestFirst(world.timeline).slice(0, limit) as entry (entry.id)}
      <li>
        <span class="when">{short(entry.time)}</span>
        <span class="what">{timelineText(entry, calendar, locale)}</span>
      </li>
    {:else}
      <li class="muted">{t('world.noTimeline')}</li>
    {/each}
  </ol>
</div>

<style>
  .muted {
    color: var(--text-muted);
  }

  .row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .row input[type='text'] {
    flex: 1;
    min-width: 0;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }

  .list li {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .when {
    flex: none;
    min-width: 92px;
    color: var(--text-muted);
    font-size: 12px;
  }

  .what {
    flex: 1;
  }

  .timeline {
    max-height: 220px;
    padding-right: var(--scroll-room);
    overflow-y: auto;
  }

  form button {
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  form button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
