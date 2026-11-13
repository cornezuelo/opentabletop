<script lang="ts">
  import {
    calendarOf,
    lastStepEntries,
    localize,
    shownAt,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import type { TravelAction } from '@open-tabletop/travel-engine'
  import { formatClock } from '@open-tabletop/time'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { dayPartsLine } from './dayParts'
  import { idText, translator, type TravelUiKey } from './i18n'
  import { durationText, entryText } from './journal'
  import { journalContext } from './journalContext'
  import NotableBeat from './NotableBeat.svelte'
  import { beatsSeen } from './beatsSeen.svelte'
  import { tripWaits } from './waits'

  /**
   * Where a trip stands: day and time, the place, the march, the weather and where it's heading.
   * `strip`: one line for over a map, the calendar's long form behind a button; otherwise a box.
   * `latest`: what happened last too, the journal's newest line (a check, a piece laid…), and
   * what the trip waits for (a check, a step's pause), with **Continue** when `onstep` is given;
   * over a map, the important moment the last step ended on, in full, in their place.
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
    scene = false,
    terrainName,
    nameOf,
    facts,
    onstep,
    onshow,
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
    /** A scene (a trip standing at one place): no march, no way on, no destination. */
    scene?: boolean
    /** For the latest line, in the journal's words: a terrain's and a definition's names. */
    terrainName?: (id: string) => string
    nameOf?: (id: string) => string
    /** The host's facts (the world clock's), for members' values made of them. */
    facts?: Record<string, unknown>
    /** Goes on from a pause (a check, a step that waits) from the strip. */
    onstep?: (action: TravelAction) => void
    /** Shows the trip's panel, for a pause that asks for a choice. */
    onshow?: () => void
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

  const context = $derived(
    journalContext({
      system,
      session,
      locale,
      t,
      startDay,
      hexLabel,
      terrainName,
      nameOf,
      facts,
    }),
  )

  /**
   * Lines the strip says already (where the party is, that it arrived): what happened last is
   * the newest line before them, the piece laid or the check rolled on the way.
   */
  const SAID = new Set(['DESTINATION_REACHED', 'PLACE_ENTERED', 'ROUTE_PLANNED'])

  /** The strip's room: the last three things that happened. */
  const NEWS = 3

  const said = (entry: Parameters<typeof entryText>[0]) =>
    entryText(entry, context).replace(/\s*\n\s*/g, ' ')

  /**
   * What happened last, story first: the story lines of the last step (the toll, the omen, a
   * blow), oldest first, the last few; with none, the journal's newest line of the rules.
   */
  const news = $derived.by((): string[] => {
    if (!latest) return []
    // The weather it set is said above, among the facts.
    const story = lastStepEntries(session).filter(
      (e) =>
        !SAID.has(e.code) &&
        shownAt(e, { level: 'story' }) &&
        (e.data?.value as { weather?: unknown } | undefined)?.weather === undefined,
    )
    if (story.length) return story.slice(-NEWS).map(said)
    const entry = session.journal.findLast(
      (e) => !SAID.has(e.code) && shownAt(e, { level: 'mechanics' }),
    )
    return entry ? [said(entry)] : []
  })
  /**
   * The weather in the system's words: the result of the table that set it (_Grey and mild_),
   * else its weather model's name for it, else its id.
   */
  const weather = $derived.by(() => {
    const id = travel.weather
    if (!id) return ''
    const told = session.journal.findLast(
      (e) => e.code === 'ORACLE_RESULT' && (e.data?.value as { weather?: unknown })?.weather === id,
    )?.text
    if (told) return told
    const models = system.weather ?? {}
    const rolled = session.journal.findLast((e) => e.code === 'WEATHER_ROLLED')?.data?.model
    const model = [models[String(rolled)], ...Object.values(models)].find((m) => m?.states?.[id])
    return localize(model?.states[id]?.name, locale, 'en') ?? id.replaceAll('-', ' ')
  })

  /** What the trip waits for (a check, a step's pause), and what goes on from it, if not a choice. */
  const waits = $derived(latest ? tripWaits(session, context, t) : null)
  /** Over a map, the important moment the last step ended on takes the news' place. */
  const notable = $derived(strip && latest && !!beatsSeen.showing(session))

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
  <div class="facts">
    <!-- A scene has no days of its own: the world's date says when. -->
    <strong>{t(scene ? 'sceneLine' : 'dayLine', time)}</strong>
    {#if !strip}{@render longForm()}{/if}
    {#if !scene}
      <span>{t('at', { hex: hexLabel(travel.location) })}</span>
    {/if}
    {#if weather}
      <span>{t('weather', { weather })}</span>
    {/if}
    {#if !scene}
      <span class="minor"
        >{t('marched', { used: marched.used, limit: marched.limit })}<InfoTip
          text={t('tips.marched')}
        /></span
      >
    {/if}
    {#if !scene && travel.progress > 0 && travel.route?.[1]}
      <span class="minor"
        >{t('onTheWay', {
          hex: hexLabel(travel.route[1]),
          time: durationText(travel.progress),
        })}</span
      >
    {/if}
    {#if strip && (time.parts || date)}
      <button
        use:tooltip={t('status.more')}
        aria-label={t('status.more')}
        aria-expanded={more}
        onclick={() => (more = !more)}>{more ? '▴' : '▾'}</button
      >
    {/if}
  </div>
  {#if strip && more}<div class="long">{@render longForm()}</div>{/if}
  {#if notable}
    <!-- An important moment: told in full, with what goes on from it. -->
    <div class="up-front">
      <NotableBeat {session} {context} {locale} {onstep} {onshow} />
    </div>
  {:else if news.length || waits || !scene}
    <div class="news">
      {#each news as line, i (i)}
        <span class="last" class:newest={i === news.length - 1} use:tooltip={line}>{line}</span>
      {/each}
      {#if waits}
        <span class="waits" role="status"
          >⏸ {waits.text}
          {#if waits.go && onstep}
            <button class="go" onclick={() => onstep(waits.go!)}>{t('continue')}</button>
          {:else if !waits.go && onshow}
            <button class="go" onclick={onshow}>{t('status.choose')}</button>
          {/if}</span
        >
      {:else if scene}
        <!-- A scene goes nowhere. -->
      {:else if travel.destination && travel.destination === travel.location}
        <!-- What happened last says the arrival: only what to do next is left. -->
        <span class="help">{news.length ? arrivedHint : `${t('arrived')} ${arrivedHint}`}</span>
      {:else if travel.destination}
        <span class="help">{t('destination', { hex: hexLabel(travel.destination) })}</span>
      {:else if destinationHint}
        <span class="help">{destinationHint}</span>
      {/if}
    </div>
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

  .facts,
  .news {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .strip {
    gap: 4px;
    padding: 6px 12px;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-left: 3px solid var(--accent);
  }

  .strip .facts,
  .strip .news {
    flex-flow: row wrap;
    gap: 2px 14px;
    align-items: center;
  }

  /* What happened: the strip's larger half, each thing apart, the newest brightest. */
  .strip .news {
    padding-top: 4px;
    font-size: 14px;
    border-top: 1px solid var(--panel-border);
  }

  .strip .news .last {
    color: var(--text-muted);
  }

  .strip .news .last + .last::before {
    margin-right: 14px;
    color: var(--panel-border);
    content: '›';
  }

  .strip .news .last.newest {
    color: var(--text);
  }

  .up-front {
    padding-top: 6px;
    border-top: 1px solid var(--panel-border);
  }

  .up-front :global(.notable) {
    box-shadow: none;
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
    max-width: 48ch;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* A pause can't be missed: the trip goes on from here or from its panel. */
  .waits {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 2px 4px 2px 8px;
    font-weight: 600;
    color: var(--warning-text);
    border: 1px solid var(--warning);
    border-radius: 4px;
  }

  .waits .go {
    padding: 1px 10px;
    color: var(--bg);
    background: var(--warning);
    border-radius: 3px;
  }

  .waits .go:hover {
    color: var(--bg);
    filter: brightness(1.1);
  }

  .help {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
