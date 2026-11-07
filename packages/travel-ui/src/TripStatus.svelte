<script lang="ts">
  import {
    calendarOf,
    localize,
    shownAt,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { formatClock } from '@open-tabletop/time'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { dayPartsLine } from './dayParts'
  import { idText, translator, type TravelUiKey } from './i18n'
  import { durationText, entryText } from './journal'
  import { journalContext } from './journalContext'

  /**
   * Where a trip stands: day and time, the place, the march, the weather and where it's heading.
   * `strip`: one line for over a map, the calendar's long form behind a button; otherwise a box.
   * `latest`: what happened last too, the journal's newest line (a check, a piece laid…).
   */
  let {
    system,
    session,
    startDay,
    locale,
    hexLabel = (hex) => hex,
    destinationHint = '',
    arrivedHint = '',
    strip = false,
    latest = false,
    terrainName,
    nameOf,
    facts,
  }: {
    system: TravelSystem
    session: SessionState
    /** Calendar day the trip started (shown as day 1). */
    startDay: number
    locale: string
    hexLabel?: (hex: string) => string
    /** Shown when there is no destination yet, e.g. "Click a hex to set the destination." */
    destinationHint?: string
    arrivedHint?: string
    strip?: boolean
    latest?: boolean
    /** For the latest line, in the journal's words: a terrain's and a definition's names. */
    terrainName?: (id: string) => string
    nameOf?: (id: string) => string
    /** The host's facts (the world clock's), for members' values made of them. */
    facts?: Record<string, unknown>
  } = $props()

  const t = translator(() => locale)
  const travel = $derived(session.travel)
  const calendar = $derived(calendarOf(system))
  const time = $derived.by(() => {
    const parts = calendar.describe(travel.time)
    return {
      day: parts.day - startDay + 1,
      clock: formatClock(parts),
      season: parts.season ? idText(t, `seasons.${parts.season}`, parts.season) : '',
      // What it is in each division of the calendar's day: "Meals: elevenses".
      parts: dayPartsLine(calendar, travel.time, locale, t('watches')),
    }
  })
  /** With a calendar of the system's own: the date, its moons and holidays. */
  const date = $derived.by(() => {
    if (!system.calendar) return null
    const parts = system.calendar.describe(travel.time)
    const name = (text: Parameters<typeof localize>[0], id: string) =>
      localize(text, locale, 'en') ?? id
    return {
      line: t('dateLine', {
        weekday: parts.weekday ? name(parts.weekday.name, parts.weekday.id) : '',
        day: parts.month.day,
        month: name(parts.month.name, parts.month.id),
        year: parts.year,
      }).replace(/^, /, ''),
      moons: parts.moons
        .map((m) => `${name(m.name, m.id)}: ${t(`moonPhases.${m.phase}` as TravelUiKey)}`)
        .join(' · '),
      holidays: parts.holidays.map((h) => name(h.name, h.id)).join(', '),
    }
  })

  /** Marching hours used today vs. the rules' daily limit. */
  const marched = $derived.by(() => {
    const used = travel.travelledToday
    return {
      used: `${Math.floor(used / 60)} h ${String(Math.round(used % 60)).padStart(2, '0')}`,
      limit: system.rules.travel.hoursPerDay,
    }
  })

  /** The journal's newest line (the story and the rules, not what happened behind), in words. */
  const lastLine = $derived.by(() => {
    if (!latest) return ''
    const entry = session.journal.findLast((e) => shownAt(e, { level: 'mechanics' }))
    if (!entry) return ''
    const context = journalContext({
      system,
      session,
      locale,
      t,
      startDay,
      hexLabel,
      terrainName,
      nameOf,
      facts,
    })
    return entryText(entry, context).replace(/\s*\n\s*/g, ' ')
  })

  /** The strip's long form is open. */
  let more = $state(false)
</script>

{#snippet longForm()}
  {#if time.parts}<span>{time.parts}</span>{/if}
  {#if date}
    <span>{date.line}{date.holidays ? ` · ${date.holidays}` : ''}</span>
    {#if date.moons}<span>{date.moons}</span>{/if}
  {/if}
{/snippet}

<div class="status" class:strip class:more>
  <strong>{t('dayLine', time)}</strong>
  {#if !strip}{@render longForm()}{/if}
  <span>{t('at', { hex: hexLabel(travel.location) })}</span>
  <span class="minor"
    >{t('marched', { used: marched.used, limit: marched.limit })}<InfoTip
      text={t('tips.marched')}
    /></span
  >
  {#if travel.progress > 0 && travel.route?.[1]}
    <span class="minor"
      >{t('onTheWay', {
        hex: hexLabel(travel.route[1]),
        time: durationText(travel.progress),
      })}</span
    >
  {/if}
  {#if travel.weather}
    <span class="minor">{t('weather', { weather: travel.weather.replaceAll('-', ' ') })}</span>
  {/if}
  {#if lastLine}
    <span class="last" use:tooltip={lastLine}>{lastLine}</span>
  {/if}
  {#if travel.destination && travel.destination === travel.location}
    <!-- What happened last says the arrival: only what to do next is left. -->
    <span>{lastLine ? arrivedHint : `${t('arrived')} ${arrivedHint}`}</span>
  {:else if travel.destination}
    <span>{t('destination', { hex: hexLabel(travel.destination) })}</span>
  {:else if destinationHint}
    <span class="help">{destinationHint}</span>
  {/if}
  {#if strip && (time.parts || date)}
    <button
      use:tooltip={t('status.more')}
      aria-label={t('status.more')}
      aria-expanded={more}
      onclick={() => (more = !more)}>{more ? '▴' : '▾'}</button
    >
    {#if more}<div class="long">{@render longForm()}</div>{/if}
  {/if}
</div>

<style>
  .status {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    color: var(--text);
    background: var(--bg);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
  }

  .status strong {
    color: var(--accent);
  }

  .strip {
    flex-flow: row wrap;
    gap: 2px 14px;
    align-items: center;
    padding: 5px 10px;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-left: 3px solid var(--accent);
  }

  /* On a phone the strip is the moment and the place; its button opens the rest. */
  @media (max-width: 760px) {
    .strip:not(.more) .minor {
      display: none;
    }
  }

  .long {
    display: flex;
    flex: 1 1 100%;
    flex-direction: column;
    gap: 2px;
    color: var(--text-muted);
  }

  button {
    padding: 0 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  button:hover {
    color: var(--accent);
  }

  .last {
    overflow: hidden;
    max-width: 60ch;
    font-style: italic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .help {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
