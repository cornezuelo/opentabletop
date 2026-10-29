<script lang="ts">
  import { localize } from '@open-tabletop/session'
  import type { Calendar, GameTime } from '@open-tabletop/time'
  import type { WorldState } from '@open-tabletop/world-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator, type CampaignUiKey } from './i18n'
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
  const name = (text: Parameters<typeof localize>[0], id: string) =>
    localize(text, locale, 'en') ?? id
  /** A line that starts with a moon's name ("the Pale Moon is full") starts in capitals. */
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
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
    {#each [...world.timeline].reverse().slice(0, limit) as entry (entry.id)}
      <li>
        <span class="when">{short(entry.time)}</span>
        <span class="what"
          >{entry.code === 'HOLIDAY'
            ? name(
                (
                  calendar as { def?: { holidays?: { id: string; name?: never }[] } }
                ).def?.holidays?.find((h) => h.id === entry.data?.holiday)?.name,
                String(entry.data?.holiday),
              )
            : entry.code === 'MOON'
              ? capitalize(
                  t('world.moonLine', {
                    moon: name(
                      (
                        calendar as { def?: { moons?: { id: string; name?: never }[] } }
                      ).def?.moons?.find((m) => m.id === entry.data?.moon)?.name,
                      String(entry.data?.moon),
                    ),
                    phase: t(`world.moon.${entry.data?.phase}` as CampaignUiKey),
                  }),
                )
              : entry.code === 'CLOCK'
                ? `${entry.text} ${entry.data?.filled}/${entry.data?.segments}`
                : entry.code === 'CLOCK_FILLED'
                  ? t('world.clockFilled', { name: entry.text ?? '' })
                  : entry.code === 'REWOUND'
                    ? t('world.rewound', { from: short(Number(entry.data?.from)) })
                    : entry.text}</span
        >
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
