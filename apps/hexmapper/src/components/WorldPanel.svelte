<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { localize } from '@open-tabletop/session'
  import { formatClock, type CalendarParts, type GameTime } from '@open-tabletop/time'
  import { factId, isEventId, type ScheduledEvent } from '@open-tabletop/world-engine'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import { en } from '../lib/i18n/en'
  import { sessionOf } from '../lib/play/play'
  import {
    advanceWorld,
    defaultStart,
    setWorldDate,
    startWorld,
    stopWorld,
    upcoming,
    worldAct,
    worldCalendar,
    worldWeatherNow,
  } from '../lib/play/world.svelte'
  import { editor } from '../lib/store/editor.svelte'
  import DateInput from './DateInput.svelte'

  /** The world clock: the date, moving time on, events to come, progress clocks, timeline. */
  const world = $derived(editor.world)
  const calendar = $derived.by(() => {
    void editor.play
    return worldCalendar()
  })
  const trip = $derived(editor.play ? sessionOf(editor.play) : null)
  /** With a route planned, moving time on travels along it. */
  const travelling = $derived((trip?.travel.route?.length ?? 0) > 1)
  const coordOf = (key: string) =>
    formatCoord(parseKey(key as HexKey), editor.grid.coordFormat, editor.grid)
  const name = (text: Parameters<typeof localize>[0], id: string) =>
    localize(text, getLocale(), 'en') ?? id
  /** A line that starts with a moon's name ("the Pale Moon is full") starts in capitals. */
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

  /** "Day 12 · 14:00 · summer", and with a calendar of its own the date, moons and feasts. */
  function when(time: GameTime) {
    const parts = calendar.describe(time)
    const head = t('world.dayLine', {
      day: parts.day,
      clock: formatClock(parts),
      // A calendar of a pack may have seasons of its own: shown as they are.
      season: !parts.season
        ? ''
        : parts.season in en.world.seasons
          ? t(`world.seasons.${parts.season}` as MessageKey)
          : parts.season,
    })
    if (!('month' in parts)) return { head, date: '', moons: '', holidays: '' }
    const p = parts as CalendarParts
    return {
      head,
      date: t('world.date', {
        weekday: p.weekday ? name(p.weekday.name, p.weekday.id) : '',
        day: p.month.day,
        month: name(p.month.name, p.month.id),
        year: p.year,
      }).replace(/^, /, ''),
      moons: p.moons
        .map((m) => `${name(m.name, m.id)}: ${t(`world.moon.${m.phase}` as MessageKey)}`)
        .join(' · '),
      holidays: p.holidays.map((h) => name(h.name, h.id)).join(', '),
    }
  }
  /** Short: "Day 15, 09:00" (and the month's day with a calendar of its own). */
  function short(time: GameTime) {
    const parts = calendar.describe(time)
    const date =
      'month' in parts
        ? `${(parts as CalendarParts).month.day} ${name((parts as CalendarParts).month.name, (parts as CalendarParts).month.id)}`
        : t('world.day', { day: parts.day })
    return `${date}, ${formatClock(parts)}`
  }
  const now = $derived(world ? when(world.time) : null)
  /** Today's weather: the trip's, or the world clock's own. */
  const weather = $derived.by(() => {
    void world
    void editor.play
    return worldWeatherNow()
  })
  /** Where a trip going on is headed, or where it waits. */
  const tripHex = $derived(
    trip ? coordOf((travelling ? trip.travel.destination : null) ?? trip.travel.location) : '',
  )
  /** What the buttons do, and during a trip what that means for the party. */
  const advanceHelp = $derived(
    !trip
      ? t('world.advanceHelp')
      : `${t(travelling ? 'world.tripHelpTravel' : 'world.tripHelp', { hex: tripHex })}\n${t('world.advanceHelp')}`,
  )
  const watchMinutes = $derived(
    ((calendar as { def?: { watchHours?: number } }).def?.watchHours ?? 4) * 60,
  )

  // The date the clock starts at, and the date it's set to.
  let startAt = $state(0)
  $effect.pre(() => {
    if (!world) startAt = defaultStart()
  })
  let settingDate = $state(false)
  let dateTo = $state(0)

  // New event: in N days or on a date, at a time of day, maybe repeating; with an id.
  let eventName = $state('')
  let eventId = $state('')
  let eventDescription = $state('')
  let when_ = $state<'in' | 'on'>('in')
  let inDays = $state(1)
  let atClock = $state('12:00')
  let onDate = $state(0)
  let repeat = $state<'none' | 'days' | 'yearly'>('none')
  let every = $state(7)
  // A date to schedule on starts at tomorrow's same time.
  $effect.pre(() => {
    if (when_ === 'on' && world && !onDate) onDate = world.time + calendar.minutesPerDay
  })
  /** The id an event gets if none is typed: its name as an id, made unique by the engine. */
  const madeId = $derived(factId(eventName))
  const badId = $derived(!!eventId.trim() && !isEventId(eventId.trim()))
  const takenId = $derived(!!world?.events.some((e) => e.id === eventId.trim()))
  function schedule() {
    if (!world || !eventName.trim() || badId) return
    let at: number
    if (when_ === 'on') at = onDate
    else {
      const day = calendar.describe(world.time).day + Math.max(0, Math.round(inDays))
      at = calendar.at(day, /^\d{1,2}:\d{2}$/.test(atClock) ? atClock : '12:00')
      if (at <= world.time) at += calendar.minutesPerDay
    }
    worldAct({
      type: 'schedule',
      event: {
        name: eventName.trim(),
        at,
        ...(eventId.trim() && { id: eventId.trim() }),
        ...(eventDescription.trim() && { description: eventDescription.trim() }),
        ...(repeat === 'days' && { repeat: { days: Math.max(1, Math.round(every)) } }),
        ...(repeat === 'yearly' && { repeat: { yearly: true as const } }),
      },
    })
    eventName = ''
    eventId = ''
    eventDescription = ''
  }
  const repeatText = (e: ScheduledEvent) =>
    !e.repeat
      ? ''
      : 'days' in e.repeat
        ? t('world.everyDays', { days: e.repeat.days })
        : t('world.yearly')

  // New progress clock.
  let clockName = $state('')
  let segments = $state(6)
  function addClock() {
    if (!clockName.trim()) return
    worldAct({ type: 'addClock', clock: { name: clockName.trim(), segments } })
    clockName = ''
  }

  let note = $state('')
</script>

{#if !world}
  <p class="help">{t('world.intro')}</p>
  <div class="field">
    <span>{t('world.startAt')}<InfoTip text={t('world.startAtHelp')} /></span>
    {#if trip}<p class="muted small">{t('world.startAtTrip')}</p>
    {:else}<DateInput {calendar} bind:value={startAt} />{/if}
  </div>
  <button class="primary" onclick={() => startWorld(startAt)}>{t('world.start')}</button>
{:else}
  <div class="now">
    <strong>{now?.head}</strong>
    {#if now?.date}<span>{now.date}{now.holidays ? ` · ${now.holidays}` : ''}</span>{/if}
    {#if now?.moons}<span class="muted">{now.moons}</span>{/if}
    {#if weather}<span
        >{t('world.weatherLine', { weather: weather.name })}<InfoTip
          text={t('world.weatherHelp')}
        /></span
      >{/if}
    {#if !settingDate}
      <button
        class="link"
        onclick={() => {
          dateTo = world.time
          settingDate = true
        }}>{t('world.setDate')}</button
      >
    {:else}
      <div class="field">
        <span>{t('world.setDate')}<InfoTip text={t('world.setDateHelp')} /></span>
        <DateInput {calendar} bind:value={dateTo} />
        <div class="row">
          <button
            onclick={async () => {
              await setWorldDate(dateTo)
              settingDate = false
            }}
            disabled={dateTo === world.time}>{t('world.setDateGo')}</button
          >
          <button onclick={() => (settingDate = false)}>{t('world.setDateCancel')}</button>
        </div>
      </div>
    {/if}
  </div>

  <div class="field">
    <span
      >{trip
        ? t(travelling ? 'world.tripAdvanceTravel' : 'world.tripAdvance')
        : t('world.advance')}<InfoTip text={advanceHelp} /></span
    >
    <div class="buttons">
      <button onclick={() => advanceWorld({ minutes: 60 })}>{t('world.hour')}</button>
      <button onclick={() => advanceWorld({ minutes: watchMinutes })}>{t('world.watch')}</button>
      <button onclick={() => advanceWorld({ until: 'dusk' })}>{t('world.dusk')}</button>
      <button onclick={() => advanceWorld({ until: 'dawn' })}>{t('world.dawn')}</button>
      <button onclick={() => advanceWorld({ until: 'next-day' })}>{t('world.nextDay')}</button>
      <button
        disabled={!upcoming(world).length}
        onclick={() => advanceWorld({ until: 'next-event' })}>{t('world.nextEvent')}</button
      >
    </div>
    {#if trip}<p class="trip">
        {t(travelling ? 'world.tripNoticeTravel' : 'world.tripNotice', { hex: tripHex })}
      </p>{/if}
  </div>

  <div class="field">
    <span>{t('world.events')}<InfoTip text={t('world.eventsHelp')} /></span>
    <ul class="list">
      {#each upcoming(world) as event (event.id)}
        <li>
          <span class="when">{short(event.at)}</span>
          <span class="what"
            >{event.name}{#if event.repeat}<small> · {repeatText(event)}</small>{/if}
            <small class="muted desc"
              ><code>{event.id}</code>{#if event.description}
                — {event.description}{/if}</small
            ></span
          >
          <button
            class="icon"
            aria-label={t('world.cancel')}
            use:tooltip={t('world.cancel')}
            onclick={async () =>
              (await confirmAction(t('world.confirmCancel', { name: event.name }))) &&
              worldAct({ type: 'cancel', id: event.id })}>✕</button
          >
        </li>
      {:else}
        <li class="muted">{t('world.noEvents')}</li>
      {/each}
    </ul>
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault()
        schedule()
      }}
    >
      <input type="text" bind:value={eventName} placeholder={t('world.eventName')} />
      <label class="row"
        ><span class="small">{t('world.eventId')}<InfoTip text={t('world.eventIdHelp')} /></span>
        <input type="text" bind:value={eventId} placeholder={madeId} />
      </label>
      {#if badId}<p class="bad">{t('world.eventIdBad')}</p>
      {:else if takenId}<p class="muted small">{t('world.eventIdTaken')}</p>{/if}
      <input type="text" bind:value={eventDescription} placeholder={t('world.eventDescription')} />
      <div class="row">
        <select bind:value={when_} aria-label={t('world.when')}>
          <option value="in">{t('world.inDays')}</option>
          <option value="on">{t('world.onDate')}</option>
        </select>
        {#if when_ === 'in'}
          <input type="number" min="0" bind:value={inDays} aria-label={t('world.inDays')} />
          <label
            >{t('world.at')}
            <input type="text" class="clock" bind:value={atClock} placeholder="12:00" />
          </label>
        {/if}
      </div>
      {#if when_ === 'on'}
        <DateInput {calendar} bind:value={onDate} />
        {#if onDate <= world.time}<p class="bad">{t('world.onDatePast')}</p>{/if}
      {/if}
      <div class="row">
        <select bind:value={repeat} aria-label={t('world.repeat')}>
          <option value="none">{t('world.once')}</option>
          <option value="days">{t('world.everyN')}</option>
          <option value="yearly">{t('world.yearly')}</option>
        </select>
        {#if repeat === 'days'}
          <input type="number" min="1" bind:value={every} aria-label={t('world.everyN')} />
        {/if}
        <button
          type="submit"
          disabled={!eventName.trim() || badId || (when_ === 'on' && onDate <= world.time)}
          >{t('world.schedule')}</button
        >
      </div>
    </form>
  </div>

  <div class="field">
    <span>{t('world.clocks')}<InfoTip text={t('world.clocksHelp')} /></span>
    {#each world.clocks as clock (clock.id)}
      <div class="clock-row">
        <input
          type="text"
          value={clock.name}
          aria-label={t('world.clockName')}
          onchange={(e) =>
            worldAct({ type: 'updateClock', id: clock.id, patch: { name: e.currentTarget.value } })}
        />
        <div class="segments" role="group" aria-label={`${clock.filled}/${clock.segments}`}>
          {#each Array.from({ length: clock.segments }, (_, i) => i) as i (i)}
            <button
              class="segment"
              class:on={i < clock.filled}
              aria-label={`${i + 1}/${clock.segments}`}
              onclick={() =>
                worldAct({
                  type: 'tick',
                  id: clock.id,
                  segments: (i + 1 === clock.filled ? i : i + 1) - clock.filled,
                })}
            ></button>
          {/each}
        </div>
        <span class="count" class:full={clock.filled === clock.segments}
          >{clock.filled}/{clock.segments}</span
        >
        <button
          class="icon"
          aria-label={t('world.removeClock')}
          use:tooltip={t('world.removeClock')}
          onclick={async () =>
            (await confirmAction(t('world.confirmRemoveClock', { name: clock.name }))) &&
            worldAct({ type: 'removeClock', id: clock.id })}>✕</button
        >
      </div>
    {/each}
    <form
      class="row"
      onsubmit={(e) => {
        e.preventDefault()
        addClock()
      }}
    >
      <input type="text" bind:value={clockName} placeholder={t('world.clockName')} />
      <select bind:value={segments} aria-label={t('world.segments')}>
        {#each [4, 6, 8, 10, 12] as n (n)}<option value={n}>{n}</option>{/each}
      </select>
      <button type="submit" disabled={!clockName.trim()}>{t('world.addClock')}</button>
    </form>
  </div>

  <div class="field">
    <span>{t('world.timeline')}<InfoTip text={t('world.timelineHelp')} /></span>
    <form
      class="row"
      onsubmit={(e) => {
        e.preventDefault()
        worldAct({ type: 'note', text: note })
        note = ''
      }}
    >
      <input type="text" bind:value={note} placeholder={t('world.note')} />
      <button type="submit" disabled={!note.trim()}>{t('world.addNote')}</button>
    </form>
    <ol class="list timeline">
      {#each [...world.timeline].reverse().slice(0, 40) as entry (entry.id)}
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
                      phase: t(`world.moon.${entry.data?.phase}` as MessageKey),
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

  <button
    class="danger"
    onclick={async () => (await confirmAction(t('world.confirmStop'))) && stopWorld()}
    >{t('world.stop')}</button
  >
{/if}

<style>
  .now {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .muted {
    color: var(--text-muted);
  }

  .small {
    font-size: 12px;
  }

  .desc {
    display: block;
  }

  .bad {
    margin: 0;
    font-size: 12px;
    color: var(--danger, #c0392b);
  }

  .link {
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }

  /* A trip going on: what the buttons will do to the party, where it doesn't get in the way. */
  .trip {
    margin: 6px 0 0;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: rgb(200 162 74 / 0.08);
    border-left: 2px solid var(--accent);
    border-radius: 0 4px 4px 0;
  }

  .buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
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

  .add {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }

  .row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .row label {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .row input[type='number'] {
    width: 56px;
  }

  .row input[type='text'] {
    flex: 1;
    min-width: 0;
  }

  .clock {
    width: 60px;
    flex: none !important;
  }

  .clock-row {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 4px;
  }

  .clock-row input {
    flex: 1;
    min-width: 0;
  }

  .segments {
    display: flex;
    gap: 2px;
  }

  .segment {
    width: 12px;
    height: 16px;
    padding: 0;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 2px;
    cursor: pointer;
  }

  .segment.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
  }

  .count.full {
    color: var(--accent);
  }

  .buttons button,
  form button,
  .primary,
  .danger {
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons button:hover:not(:disabled),
  form button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .primary {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .danger {
    margin-top: 12px;
    color: #e09a90;
  }

  .icon {
    padding: 0 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
