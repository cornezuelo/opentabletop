<script lang="ts">
  import { usesOf, type Declared, type Use } from '@open-tabletop/session'
  import { usesHelp } from './uses'
  import {
    localize,
    editPartySheet,
    entryTopic,
    JOURNAL_LEVELS,
    JOURNAL_TOPICS,
    lastStepEntries,
    partyOf,
    shownAt,
    picksWho,
    tripAvailability,
    type JournalEntry,
    type RosterPlace,
    type SessionState,
    type StatDefinition,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { formatClock } from '@open-tabletop/time'
  import {
    actionNothingOf,
    changesText,
    durationText,
    entryClock,
    entryText,
    eventName,
    filterJournal,
    journalMarkdown,
    tripDay,
    whyText,
  } from './journal'
  import {
    actionMinutes,
    actionSteps,
    askedParams,
    availableActions,
    isClock,
    isPartRef,
    findPartRef,
    refId,
    movingActions,
    noTotals,
    paramDefault,
    checkInfo,
    declaredValues,
    type ActionParam,
    type ParamChoice,
    type TravelAction,
    type TravelWorld,
    type Unavailable,
  } from '@open-tabletop/travel-engine'
  import {
    calendarOf,
    placeIdOf,
    pendingLine,
    sharingRoom,
    waitingForRoom,
  } from '@open-tabletop/session'
  import { InfoTip, Tabs, tooltip, type TooltipText } from '@open-tabletop/ui-kit'
  import { idText, translator, type TravelUiKey } from './i18n'
  import { memberLabel, memberNamer, statSource } from './members'
  import { dayPartsLine, divisionName, partName } from './dayParts'
  import Section from './Section.svelte'
  import { tripTab, type TripTab } from './tripTab.svelte'
  import { journalFilter } from './journalFilter.svelte'
  import PartyMembers from './PartyMembers.svelte'
  import PartyRoster from './PartyRoster.svelte'
  import PresentHere from './PresentHere.svelte'
  import { CharacterCard, SheetOrigin } from '@open-tabletop/character-ui'
  import type { WaitingSaid } from '@open-tabletop/campaign'
  import { WorldWaiting } from '@open-tabletop/campaign-ui'

  /**
   * A trip in progress: day and time, where the party is and where it's heading, travel
   * mode, the party's sheet and stats, the system's actions, pending checks and journal.
   * The host decides what a hex is called and how a destination is chosen.
   */
  let {
    system,
    session,
    startDay,
    locale,
    hexLabel = (hex) => hex,
    terrainName = (id) => id.replaceAll('-', ' '),
    nameOf = (id) => id,
    destinationHint = '',
    arrivedHint = '',
    title = '',
    relationTargets = [],
    world,
    facts,
    place,
    systemWhere = '',
    uses = [],
    onstep,
    onedit,
    onshare,
    worldWaiting,
    onworld,
  }: {
    system: TravelSystem
    session: SessionState
    /** The map, for actions whose conditions read it (terrain, tags…). */
    world?: TravelWorld
    /** The host's facts for actions' conditions (the world clock's clocks and events). */
    facts?: Record<string, unknown>
    /** Calendar day the trip started (shown as day 1). */
    startDay: number
    locale: string
    hexLabel?: (hex: string) => string
    /** Name of a terrain id, in the UI language (journal: "nothing to forage on hills"). */
    terrainName?: (id: string) => string
    /** Display name of an Oracle definition (journal entries of hand rolls). */
    nameOf?: (id: string) => string
    /** Shown when there is no destination yet, e.g. "Click a hex to set the destination." */
    destinationHint?: string
    arrivedHint?: string
    /** Title of the exported journal (and its file name), e.g. the map's or system's name. */
    title?: string
    onstep: (action: TravelAction) => void
    /** What the characters' relations may point at, besides each other (places, regions…). */
    relationTargets?: { ref: string; label: string }[]
    /** The trip as a place of the roster: its characters can come from it and be kept in it. */
    place?: RosterPlace
    /** Where the host's system is chosen (basic Markdown), for the help of whose sheet it is. */
    systemWhere?: string
    /**
     * Where the system's names are used (session's `systemUses`): the help of a stat, a
     * supply or a role says what reads and changes it.
     */
    uses?: Use[]
    /** Changes the session directly (stats, mode, the party) without a travel step. */
    onedit: (update: (session: SessionState) => SessionState) => void
    /**
     * Answers the first share waiting (**Ask who gives**): what each member gives (negative)
     * or takes, or nothing to keep the rule's (session's `shareTrip`).
     */
    onshare?: (moved?: Record<string, number>) => void
    /**
     * What the campaign's world waits for the player to answer (a reaction's pause or
     * question), if anything: the trip doesn't move until it's answered (`onworld`).
     */
    worldWaiting?: WaitingSaid
    onworld?: (choice?: string) => void
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

  /** What the trip has done so far (`trip.*` for conditions and tables). */
  const totals = $derived.by(() => {
    const all = travel.totals ?? noTotals()
    const km = Math.round(all.km * 10) / 10
    const list = (counts: Record<string, number>, name: (id: string) => string) =>
      Object.entries(counts)
        .filter(([, n]) => n)
        .map(([id, n]) => `${name(id)} ${Math.round(n * 100) / 100}`)
        .join(' · ')
    return {
      line: t('totals.line', {
        places: all.places,
        km: t('totals.km', { km }),
        hours: `${Math.floor(all.marched / 60)} h ${String(Math.round(all.marched % 60)).padStart(2, '0')}`,
      }),
      checks: all.checks,
      taken: list(all.taken, actionName),
      spent: list(all.spent, numberName),
      gained: list(all.gained, numberName),
    }
  })

  /** The system's declared stats only: nothing it doesn't declare is shown. */
  // A stat made of the party sheet's value is edited there, on the party's card.
  const stats = $derived<[string, StatDefinition][]>(
    Object.entries(system.bindings?.stats ?? {}).filter(
      ([, stat]) => !(stat.from?.party && system.partySheet && session.party),
    ),
  )
  /** Whether the player chooses who rolls (stats made of one character, and characters). */
  const choosesWho = $derived(picksWho(partyOf(system)) && (session.members?.length ?? 0) > 0)
  const setRolls = (who: string) =>
    onedit((s) => {
      const next = { ...s, stats: { ...s.stats } }
      if (who) next.rolls = who
      else delete next.rolls
      return next
    })

  /** The party's own sheet changed by hand: the stats made of it follow. */
  function editParty(next: NonNullable<SessionState['party']>) {
    onedit((s) => {
      const copy = {
        ...s,
        stats: { ...s.stats },
        travel: { ...s.travel },
      }
      editPartySheet(copy, partyOf(system), next)
      return copy
    })
  }
  const actions = $derived(availableActions(system.rules))
  /** The actions that move the party (a `travel.move` step): they need a route. */
  const movers = $derived(new Set(movingActions(system.rules)))
  /** How the trip goes on by itself (`travel.onward`), if the system says. */
  const onward = $derived(system.rules.travel.onward)
  /** The action it takes, by its id (`actions.march` is `march`). */
  const onwardAction = $derived(onward && refId('actions', onward.do))
  /**
   * The player's actions: every action but those the system takes by itself (`on:`), the
   * ones that move first; one that hides while it can't be taken only shows when it can.
   */
  const buttons = $derived(
    Object.keys(actions.all)
      .filter((id) => !actions.all[id].on && !(actions.all[id].hideWhenUnavailable && blocked[id]))
      .sort((a, b) => Number(movers.has(b)) - Number(movers.has(a))),
  )
  /** The action whose move is under way (stopped by a check): **Go on** goes on with it. */
  const goingOn = $derived(travel.moving?.frames.at(-1)?.action)
  /** The button that stands out: going on, else the way the trip goes on by itself. */
  const main = $derived(
    goingOn ? undefined : (onwardAction ?? buttons.find((id) => movers.has(id))),
  )

  /** The choices made in each action's parameters, by action and parameter (none: its default). */
  let chosen = $state<Record<string, Record<string, string>>>({})
  const choiceId = (c: ParamChoice) => (typeof c === 'object' ? c.id : c)
  /** A choice in words: its name, or what a move's target says ("to the destination", "3 hexes"). */
  const choiceName = (c: ParamChoice) => {
    const named = typeof c === 'object' ? localize(c.name, locale, 'en') : undefined
    if (named) return named
    const id = String(choiceId(c))
    if (id === 'destination' || id === 'place') return t(`choices.${id}`)
    return /^\d+$/.test(id) ? t('choices.hexes', { n: id }) : id.replaceAll('-', ' ')
  }
  const paramName = (key: string, param: ActionParam) => localize(param.name, locale, 'en') ?? key
  /** A choice the player is asked for (`ask:`): its name, or its value made readable. */
  const askedName = (c: ParamChoice) =>
    (typeof c === 'object' ? localize(c.name, locale, 'en') : undefined) ??
    String(choiceId(c)).replaceAll('-', ' ')
  const choiceTip = (c: ParamChoice) =>
    typeof c === 'object' ? (localize(c.description, locale, 'en') ?? '') : ''
  /** The step waiting for the player (`pause:`, `ask:`), and what it asks. */
  const waiting = $derived(travel.waiting)
  const asked = $derived(
    waiting?.ask ? actions.all[waiting.action]?.params?.[waiting.ask] : undefined,
  )
  const choiceOf = (id: string, key: string, param: ActionParam) =>
    chosen[id]?.[key] ?? String(paramDefault(param))
  /** What an action is taken with: each parameter's choice, as the pack wrote it (`3`, not `'3'`). */
  const withOf = (id: string): Record<string, unknown> | undefined => {
    const params = Object.entries(actions.all[id]?.params ?? {})
    if (!params.length) return undefined
    return Object.fromEntries(
      params.map(([key, param]) => {
        const value = choiceOf(id, key, param)
        return [key, param.choices.map(choiceId).find((c) => String(c) === value) ?? value]
      }),
    )
  }
  function take(id: string) {
    const given = withOf(id)
    onstep({ type: 'action', id, ...(given && { with: given }) })
  }
  /** An action's button: its name, and how long it lasts when that's fixed ("Rest (2 h)"). */
  const buttonText = (id: string) => {
    const minutes = actionMinutes(actions.all[id])
    return minutes ? `${actionName(id)} (${durationText(minutes)})` : actionName(id)
  }
  /** What can't be done now (travel, actions) and why. */
  const blocked = $derived(tripAvailability({ system, world, facts }, session))
  /** The values of the day the system declares, by their names (lost: Lost). */
  const dayValues = $derived(
    Object.fromEntries(
      Object.entries(declaredValues(system.rules)).map(([id, v]) => [
        id,
        localize(v.name, locale, 'en') ?? idText(t, `values.${id}`, id),
      ]),
    ),
  )
  /** The party's characters' values and conditions in words ("Kael: Health"). */
  const memberName = $derived(memberNamer(system, session.members, locale, t, facts, session.party))
  /** Why a button is disabled, in words ('' when it isn't). */
  const why = (because: Unavailable | undefined): string =>
    whyText(because, { t, dayValues, memberName, valueName, terrainName })
  /** With characters, the stats made of theirs follow them. */
  const hasMembers = $derived(!!system.sheet && !!session.members?.length)
  const fromMembers = (stat: StatDefinition) => hasMembers && !!stat.from
  /** One of the party's values or items by its full name, in words ("Rations", "Fodder"). */
  const numberName = (path: string) => memberName(path) ?? path

  /** What the party spent or gained, shared out by the rule, waiting for who gives it. */
  const sharing = $derived(session.sharing?.[0])
  /** What each member could give of it (or, for a gain, any number). */
  const shareRoom = $derived(sharingRoom(session, partyOf(system)) ?? {})
  /** The player's answer, for the share it was given for: how many each one gives or takes. */
  let shareAnswer = $state<{ for: string; amounts: Record<string, number> }>()
  const shareKey = $derived(JSON.stringify(session.sharing?.[0] ?? null))
  const shareAmounts = $derived(
    shareAnswer?.for === shareKey
      ? shareAnswer.amounts
      : Object.fromEntries(
          Object.entries(sharing?.moved ?? {}).map(([id, n]) => [id, Math.abs(n)]),
        ),
  )
  const shareDone = $derived(Object.values(shareAmounts).reduce((n, m) => n + m, 0))
  function setShare(id: string, value: number) {
    shareAnswer = { for: shareKey, amounts: { ...shareAmounts, [id]: Math.max(0, value || 0) } }
  }
  function answerShare() {
    if (!sharing) return
    const sign = sharing.delta < 0 ? -1 : 1
    const moved = Object.fromEntries(
      Object.entries(shareAmounts).flatMap(([id, n]) => (n ? [[id, sign * n]] : [])),
    )
    shareAnswer = undefined
    onshare?.(moved)
  }
  /** Who has items waiting for room to be made for them (`full: ask`): the trip waits. */
  const roomless = $derived(waitingForRoom(session))
  /** Nothing goes on while a share waits for who gives it, or an item for room. */
  const held = $derived(
    (!!sharing && !!onshare) || roomless.length > 0 || (!!worldWaiting && !!onworld),
  )
  /** What a condition blocks, in words: moving on, an action or a way of travelling. */
  const blockName = (what: string) => {
    const mode = refId('modes', what)
    const action = refId('actions', what)
    return what === 'travel.move'
      ? t('travel')
      : mode
        ? modeName(mode)
        : action
          ? actionName(action)
          : what
  }
  /** A button's tooltip: what it does, then why it's disabled. */
  const tipWith = (tip: TooltipText, id: string): TooltipText => {
    const reason = why(blocked[id])
    if (!reason) return tip
    if (!tip) return reason
    return typeof tip === 'string'
      ? `${tip} ${reason}`.trim()
      : { markdown: `${tip.markdown}\n\n${reason}` }
  }
  const statText = (text: Parameters<typeof localize>[0], key: string) =>
    localize(text, locale, 'en') ?? key

  const actionName = (id: string) =>
    localize(actions.all[id]?.name, locale, 'en') ?? idText(t, `actions.${id}`, id)
  const checkName = (event: string) => localize(checkInfo(system.rules, event).name, locale, 'en')
  /** A check's description from its pack (basic Markdown). */
  const checkTip = (event: string) =>
    localize(checkInfo(system.rules, event).description, locale, 'en') ?? ''
  /**
   * Names the system gives its ways of travelling (the app's dictionary only names the
   * Generic rules' ones, then the id made readable).
   */
  const modeName = (id: string) =>
    localize(system.rules.modes[id]?.name, locale, 'en') ?? idText(t, `modes.${id}`, id)

  /** What an action or a rest changes, as words: "Morale +1" (from its effects). */
  function changes(own: unknown): string {
    if (typeof own !== 'object' || own === null) return ''
    const effects = (own as { effects?: Record<string, number | string> }).effects ?? {}
    return Object.keys(effects).length ? changesText({ effects }, context) : ''
  }

  /** How tables read a value, for its tooltip: "Tables read it as `{{survival}}`…". */
  /** What reads and changes one of the system's names, by the names players know. */
  const usedHelp = (declared: Declared) =>
    usesHelp(usesOf(uses, declared, system), system, locale, nameOf, t)
  const readAs = (...keys: string[]) =>
    t('tips.readAs', { keys: keys.map((k) => '`{{' + k + '}}`').join(' · ') })

  /** Name of a value results change: a stat of the system, as it names it. */
  const valueName = (key: string) => {
    const stat = system.bindings?.stats?.[key]
    if (stat) return statText(stat.name, key)
    return idText(t, `resources.${key}`, key)
  }
  /** What an action that rolled nothing says: its own text, '' without checks, or generic. */
  const actionNothing = (id: string) => actionNothingOf(system.rules, id, locale)
  /** A clock (`06:00`) or a part of the calendar's day by its name ("Meals: supper"). */
  const untilText = (moment: string) => {
    if (!isPartRef(moment)) return moment
    const found = findPartRef(calendar.divisions ?? [], moment)
    return found
      ? `${divisionName(found.division, locale, t('watches'))}: ${partName(found.division, found.part, locale)}`
      : moment
  }
  const context = $derived({
    t,
    partName: untilText,
    startDay,
    hexLabel,
    nameOf,
    actionName,
    checkName,
    calendar,
    valueName,
    terrainName,
    actionNothing,
    dayValues,
    memberName,
    textOf: (text: unknown) => localize(text as Parameters<typeof localize>[0], locale, 'en') ?? '',
    modeName,
    paramName: (action: string, key: string) => {
      const param = actions.all[action]?.params?.[key]
      return param ? paramName(key, param) : key
    },
    choiceName: (action: string, key: string, choice: string) => {
      const c = actions.all[action]?.params?.[key]?.choices.find(
        (c) => String(choiceId(c)) === choice,
      )
      return c === undefined ? choice : askedName(c)
    },
  })
  /** What an action does, for its tooltip: its description, or what its steps do. */
  function actionTip(id: string, fallback = ''): TooltipText {
    const own = actions.all[id]
    // The pack's description, in basic Markdown.
    const described = localize(own?.description, locale, 'en')
    if (described) return { markdown: described }
    if (!own) return fallback
    const steps = actionSteps(own)
    const always = steps.filter((st) => !st.when && !st.unless)
    const minutes = always.reduce((n, st) => n + (typeof st.time === 'number' ? st.time : 0), 0)
    const until = always.find((st) => isPartRef(st.time) || isClock(st.time))?.time as
      string | undefined
    const speed = always.find((st) => st['travel.speed'] !== undefined)?.['travel.speed']
    const moves = steps.some((st) => st['travel.move'] !== undefined)
    const effects = Object.assign({}, ...always.map((st) => st.effects ?? {}))
    const rolls = [
      ...new Set(
        (system.rules.checks ?? [])
          .filter((c) => c.at === id)
          .map((c) => eventName(t, c.event, checkName)),
      ),
    ]
    const parts = [
      fallback,
      !fallback && minutes ? t('tips.actionTime', { minutes }) : '',
      !fallback && until ? t('tips.actionUntil', { moment: untilText(until) }) : '',
      moves ? t('tips.actionMove') : '',
      speed !== undefined ? t('tips.actionSpeed', { speed }) : '',
      changes({ effects }) ? t('tips.actionEffects', { changes: changes({ effects }) }) : '',
      own.oncePerDay ? t('tips.actionOnce') : '',
      rolls.length ? t('tips.actionChecks', { checks: rolls.join(', ') }) : '',
    ]
    return parts.filter(Boolean).join(' ')
  }
  const text = (e: JournalEntry) => entryText(e, context)
  const pendingName = (event: unknown) => eventName(t, event, checkName)

  /** Entries grouped by day ("Day N" headers), in the order given. */
  /**
   * When a waiting check came up, if on another day than now: an action that goes on past
   * it (a camp till dawn) leaves its line in the day before, which the box then names.
   */
  function cameUp(id: string): string {
    const line = pendingLine(session.journal, id)
    if (!line) return ''
    const day = tripDay(line, startDay, calendar)
    return day === time.day
      ? ''
      : t('cameUp', { day, clock: formatClock(calendar.describe(line.time)) })
  }

  function byDay(entries: JournalEntry[]) {
    const groups: { day: number; entries: JournalEntry[] }[] = []
    for (const entry of entries) {
      const day = tripDay(entry, startDay, calendar)
      if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] })
      groups.at(-1)!.entries.push(entry)
    }
    return groups
  }
  /** The lines the Journal tab's filter lets through, oldest first (what Export writes). */
  const filtered = $derived(filterJournal(session.journal, journalFilter.current, context))
  /** Newest first. */
  const journalDays = $derived(byDay([...filtered].reverse().slice(0, 200)))
  /** The topics this journal has lines of: those the filter offers. */
  const topics = $derived(
    JOURNAL_TOPICS.filter((topic) => session.journal.some((e) => entryTopic(e) === topic)),
  )
  /**
   * What the last step did, newest first like the journal: what stopped it on top (the
   * story and the rules: what happened behind is in the Journal tab).
   */
  const lastDays = $derived(
    byDay(
      lastStepEntries(session)
        .filter((e) => shownAt(e, { level: 'mechanics' }))
        .reverse(),
    ),
  )

  /** The tabs under what the last step did: the party's only when the system has one. */
  const tabs = $derived<TripTab[]>([
    ...(stats.length || (system.partySheet && session.party) || system.sheet
      ? (['party'] as const)
      : []),
    'journal',
    'totals',
  ])
  const tab = $derived(tripTab.chosen && tabs.includes(tripTab.chosen) ? tripTab.chosen : tabs[0])
  const tabName = (id: TripTab) =>
    id === 'party' ? t('tabs.party') : id === 'journal' ? t('journalTitle') : t('tabs.totals')

  function exportJournal() {
    const markdown = journalMarkdown(filtered, context, title || t('journalTitle'))
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title || 'journal').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }
</script>

<div class="trip">
  <div class="status">
    <strong>{t('dayLine', time)}</strong>
    {#if time.parts}<span>{time.parts}</span>{/if}
    {#if date}
      <span>{date.line}{date.holidays ? ` · ${date.holidays}` : ''}</span>
      {#if date.moons}<span class="moons">{date.moons}</span>{/if}
    {/if}
    <span>{t('at', { hex: hexLabel(travel.location) })}</span>
    <span
      >{t('marched', { used: marched.used, limit: marched.limit })}<InfoTip
        text={t('tips.marched')}
      /></span
    >
    {#if travel.weather}
      <span>{t('weather', { weather: travel.weather.replaceAll('-', ' ') })}</span>
    {/if}
    {#if travel.destination && travel.destination === travel.location}
      <span>{t('arrived')} {arrivedHint}</span>
    {:else if travel.destination}
      <span>{t('destination', { hex: hexLabel(travel.destination) })}</span>
    {:else if destinationHint}
      <span class="help">{destinationHint}</span>
    {/if}
  </div>

  <!-- What needs you first, then what the party can do: right under where it is. -->
  {#each travel.pendingChecks as check (check.id)}
    <div class="pending" class:asks={session.asking?.includes(check.id)}>
      <span
        >{t(
          session.asking?.includes(check.id)
            ? 'journal.asks'
            : check.rolled
              ? 'journal.paused'
              : 'journal.pending',
          {
            event: placeIdOf(check.context)
              ? t('journal.eventAt', {
                  event: pendingName(check.event),
                  hex: hexLabel(placeIdOf(check.context)!),
                })
              : pendingName(check.event),
          },
        )}{cameUp(check.id)}{#if checkTip(check.event)}<InfoTip
            markdown={checkTip(check.event)}
          />{/if}</span
      >
      {#if session.asking?.includes(check.id)}{@render whoRolls()}{/if}
      <button onclick={() => onstep({ type: 'resolveCheck', id: check.id })}>{t('continue')}</button
      >
    </div>
  {/each}

  <!-- What the party spent or gained, shared out by the rule: who gives it (Ask who gives). -->
  {#if sharing && onshare}
    {@const count = Math.abs(sharing.delta)}
    <div class="pending asks share">
      <span
        >{t(sharing.delta < 0 ? 'share.gives' : 'share.takes', {
          count,
          name: memberName(`party.items.${sharing.item}`) ?? sharing.item,
        })}<InfoTip text={t('share.help')} /></span
      >
      <div class="givers">
        {#each (session.members ?? []).filter((m) => m.id in shareRoom) as m (m.id)}
          <label
            >{memberLabel(m)}
            <input
              type="number"
              min="0"
              max={sharing.delta < 0 ? shareRoom[m.id] : count}
              value={shareAmounts[m.id] ?? 0}
              onchange={(e) => setShare(m.id, Number(e.currentTarget.value))}
            />{#if sharing.delta < 0}<span class="help"
                >{t('share.of', { room: shareRoom[m.id] })}</span
              >{/if}</label
          >
        {/each}
      </div>
      <span class:help={shareDone === count} class:wrong={shareDone !== count}
        >{t('share.total', { done: shareDone, count })}</span
      >
      <button
        disabled={shareDone !== count ||
          (sharing.delta < 0 &&
            Object.entries(shareAmounts).some(([id, n]) => n > (shareRoom[id] ?? 0)))}
        onclick={answerShare}>{t('share.keep')}</button
      >
    </div>
  {/if}

  <!-- Items given with no room left, waiting for the player to make room on the cards. -->
  {#if roomless.length}
    <div class="pending asks">
      <span
        >{t('room.waits', {
          names: roomless
            .map((id) => {
              const m = [session.party, ...(session.members ?? [])].find((c) => c?.id === id)
              return m ? memberLabel(m) : id
            })
            .join(', '),
        })}<InfoTip text={t('room.help')} /></span
      >
    </div>
  {/if}

  <!-- The campaign's world waits for the player: the trip goes on once it's answered. -->
  {#if worldWaiting && onworld}
    <WorldWaiting {locale} waiting={worldWaiting} onanswer={onworld} />
  {/if}

  <!-- A step that stops the trip for the player: Continue, or the choices it asks among. -->
  {#if waiting}
    <div class="pending" class:asks={!!asked}>
      <span
        >{entryText(
          { id: '', at: '', time: waiting.time, source: 'travel', code: 'HELD', data: { waiting } },
          context,
        )}{#if asked && localize(asked.description, locale, 'en')}<InfoTip
            markdown={localize(asked.description, locale, 'en')}
          />{/if}</span
      >
      {#if asked}
        {#each asked.choices as c (String(choiceId(c)))}
          <button
            use:tooltip={choiceTip(c)}
            onclick={() => onstep({ type: 'resume', choice: choiceId(c) })}>{askedName(c)}</button
          >
        {/each}
      {:else}
        <button onclick={() => onstep({ type: 'resume' })}>{t('continue')}</button>
      {/if}
    </div>
  {/if}

  <!-- Nothing goes on while a share waits for who gives it, or an item for room. -->
  <div class="actions" class:held inert={held}>
    {#if goingOn && !waiting}
      <button
        class="primary"
        use:tooltip={tipWith(t('tips.goOn', { action: actionName(goingOn) }), 'travel')}
        disabled={!!blocked.travel}
        onclick={() => onstep({ type: 'travel' })}>{t('goOn')}</button
      >
    {/if}
    {#each buttons as id (id)}
      <!-- Parameters it asks for as it goes (`ask:`) aren't chosen on its button. -->
      {@const params = Object.entries(actions.all[id].params ?? {}).filter(
        ([key]) => !askedParams(actions.all[id]).includes(key),
      )}
      <span class="take" class:joined={params.length > 0}>
        <button
          class:primary={id === main}
          use:tooltip={tipWith(actionTip(id), id)}
          disabled={!!blocked[id] || (movers.has(id) && !travel.route)}
          onclick={() => take(id)}>{buttonText(id)}</button
        >
        {#each params as [key, param] (key)}
          <select
            aria-label={paramName(key, param)}
            use:tooltip={paramName(key, param)}
            value={choiceOf(id, key, param)}
            onchange={(e) =>
              (chosen = { ...chosen, [id]: { ...chosen[id], [key]: e.currentTarget.value } })}
          >
            {#each param.choices as c (String(choiceId(c)))}<option value={String(choiceId(c))}
                >{choiceName(c)}</option
              >{/each}
          </select>
        {/each}
      </span>
    {/each}
    {#if onward}
      <button
        use:tooltip={travel.pendingChecks.length || waiting
          ? tipWith(
              t('tips.waitOnward', { action: actionName(onwardAction ?? onward.do) }),
              'travel',
            )
          : t('tips.waitOnward', { action: actionName(onwardAction ?? onward.do) })}
        disabled={travel.pendingChecks.length > 0 || !!waiting}
        onclick={() => onstep({ type: 'waitForMarch' })}>{t('waitOnward')}</button
      >
    {/if}
  </div>
  <label class="check skip"
    ><input
      type="checkbox"
      checked={!!session.skipPauses}
      onchange={(e) => {
        const on = e.currentTarget.checked
        onedit((s) => {
          const next = { ...s }
          if (on) next.skipPauses = true
          else delete next.skipPauses
          return next
        })
      }}
    /><span>{t('skipPauses')}<InfoTip text={t('skipPausesHelp')} /></span></label
  >
  {#if onshare && system.sheet?.def.items && (session.members?.length ?? 0) > 1}
    <label class="check skip"
      ><input
        type="checkbox"
        checked={!!session.askShare}
        onchange={(e) => {
          const on = e.currentTarget.checked
          onedit((s) => {
            const next = { ...s }
            if (on) next.askShare = true
            else delete next.askShare
            return next
          })
        }}
      /><span>{t('share.ask')}<InfoTip text={t('share.help')} /></span></label
    >
  {/if}

  {#snippet rollsChoice()}
    <div class="rolls">
      <span>{t('rolls.label')}<InfoTip text={t('rolls.help')} /></span>
      {@render whoRolls()}
      <label class="check"
        ><input
          type="checkbox"
          checked={!!session.askRolls}
          onchange={(e) => {
            const on = e.currentTarget.checked
            onedit((s) => {
              const next = { ...s }
              if (on) next.askRolls = true
              else delete next.askRolls
              return next
            })
          }}
        />{t('rolls.ask')}</label
      >
    </div>
  {/snippet}
  {#snippet whoRolls()}
    <select
      class="who"
      aria-label={t('rolls.label')}
      value={session.rolls ?? ''}
      onchange={(e) => setRolls(e.currentTarget.value)}
    >
      <option value="">{t('rolls.best')}</option>
      {#each session.members ?? [] as m (m.id)}<option value={m.id}>{m.name ?? m.id}</option>{/each}
    </select>
  {/snippet}

  <div class="mode">
    <label class="field">
      <span
        >{t(
          'travelMode',
        )}{#if localize(system.rules.modes[travel.mode]?.description, locale, 'en')}<InfoTip
            markdown={localize(system.rules.modes[travel.mode]?.description, locale, 'en')}
          />{/if}</span
      >
      <select
        value={travel.mode}
        onchange={(e) => {
          const mode = e.currentTarget.value
          onedit((s) => ({ ...s, travel: { ...s.travel, mode } }))
        }}
      >
        {#each Object.keys(system.rules.modes) as mode (mode)}
          {@const because = mode === travel.mode ? '' : why(blocked[`mode.${mode}`])}
          <option value={mode} disabled={!!because}
            >{modeName(mode)} ({system.rules.modes[mode].kmPerDay} km/{t('dayUnit')}){because
              ? ` — ${because}`
              : ''}</option
          >
        {/each}
      </select>
    </label>
  </div>
  <!-- What the last step did, right under the buttons that did it. -->
  {#if session.lastStep !== undefined}
    <section class="last" aria-live="polite">
      <h3>{t('lastStep.title')}<InfoTip markdown={t('lastStep.help')} /></h3>
      {@render lines(lastDays, t('lastStep.nothing'))}
    </section>
  {/if}

  {#snippet lines(days: { day: number; entries: JournalEntry[] }[], empty: string)}
    <ol class="journal">
      {#each days as group (group.day)}
        <li class="day">{t('journalDay', { day: group.day })}</li>
        {#each group.entries as entry (entry.id)}
          <li class={entry.source} class:detail={shownAt(entry, { level: 'mechanics' }) === false}>
            <time>{entryClock(entry, calendar)}</time>
            <span>{text(entry)}</span>
          </li>
        {/each}
      {:else}
        <li class="help">{empty}</li>
      {/each}
    </ol>
  {/snippet}

  <!-- The rest, a tab at a time (the one chosen is remembered per viewer); the status, what
       waits for Continue, the buttons and the last step above are always there. -->
  <Tabs
    tabs={tabs.map((id) => ({ id, label: tabName(id) }))}
    value={tab}
    label={t('tabs.label')}
    prefix="trip"
    onchange={(id) => tripTab.choose(id)}
  />
  <div class="tabpanel" id="trip-panel" role="tabpanel" aria-labelledby="trip-tab-{tab}">
    {#if tab === 'party'}
      <!-- One place for the party: its sheet and its stats, each saying where it comes
           from; then its characters, each under a plain heading. -->
      {#if stats.length || (system.partySheet && session.party)}
        <Section
          title={t('partySheet.title')}
          help={system.partySheet && session.party
            ? t('partySheet.help')
            : t('partySheet.plainHelp')}
        >
          {#if system.partySheet && session.party}
            <SheetOrigin sheet={system.partySheet} {system} {locale} where={systemWhere} />
            {#if place}
              <PartyRoster
                system={{ ...system, partySheet: system.partySheet }}
                {session}
                {locale}
                {place}
                {onedit}
              />
            {/if}
            <CharacterCard
              sheet={system.partySheet.def}
              character={session.party}
              catalogues={system.items}
              {locale}
              names={blockName}
              path="party"
              time={session.travel.time}
              named={false}
              onchange={editParty}
            />
          {/if}
          {#if stats.length}
            <div class="stats">
              <h4 class="subhead">
                {t('section.stats')}<InfoTip markdown={t('partySheet.statsHelp')} />
              </h4>
              {#each stats as [key, stat] (key)}
                {@const source = statSource(
                  stat.from,
                  system,
                  session.members,
                  session.rolls,
                  locale,
                  t,
                )}
                <label class="field stat">
                  <span
                    >{statText(stat.name, key)}<InfoTip
                      markdown={[
                        statText(stat.description, ''),
                        fromMembers(stat) && t('members.fromMembers'),
                        readAs(key, `party.stats.${key}`),
                        usedHelp({ kind: 'stat', id: key }),
                      ]
                        .filter(Boolean)
                        .join('\n\n')}
                    /></span
                  >
                  <input
                    type="number"
                    value={session.stats[key] ?? stat.default ?? 0}
                    disabled={fromMembers(stat)}
                    onchange={(e) => {
                      const value = Number(e.currentTarget.value) || 0
                      onedit((s) => ({ ...s, stats: { ...s.stats, [key]: value } }))
                    }}
                  />
                  {#if source}<span class="source">{source}</span>{/if}
                </label>
              {/each}
            </div>
          {/if}
        </Section>
      {/if}

      {#if system.sheet}
        <PartyMembers
          rolls={choosesWho ? rollsChoice : undefined}
          system={{ ...system, sheet: system.sheet }}
          {session}
          {locale}
          names={blockName}
          targets={relationTargets}
          {place}
          {systemWhere}
          {uses}
          {nameOf}
          {onedit}
        />
      {/if}
      {#if system.bestiary?.length || session.present?.length}
        <PresentHere
          {system}
          {session}
          {locale}
          names={blockName}
          placeName={hexLabel}
          {place}
          {onedit}
        />
      {/if}
    {:else if tab === 'journal'}
      <div class="filter">
        <label class="level">
          <span>{t('filter.level')}<InfoTip markdown={t('filter.levelHelp')} /></span>
          <select
            value={journalFilter.level}
            onchange={(e) =>
              journalFilter.setLevel(e.currentTarget.value as (typeof JOURNAL_LEVELS)[number])}
          >
            {#each JOURNAL_LEVELS as level (level)}
              <option value={level}>{t(`filter.levels.${level}`)}</option>
            {/each}
          </select>
        </label>
        <button
          class="link export"
          use:tooltip={t('tips.exportJournal')}
          disabled={!filtered.length}
          onclick={exportJournal}>{t('exportJournal')}</button
        >
        {#if topics.length > 1}
          <div class="topics" role="group" aria-label={t('filter.topicsLabel')}>
            {#each topics as topic (topic)}
              <label>
                <input
                  type="checkbox"
                  checked={!journalFilter.hidden.includes(topic)}
                  onchange={() => journalFilter.toggle(topic)}
                />
                {t(`filter.topics.${topic}`)}
              </label>
            {/each}
          </div>
        {/if}
        <input
          class="search"
          type="search"
          placeholder={t('filter.search')}
          aria-label={t('filter.search')}
          bind:value={journalFilter.search}
        />
      </div>
      {@render lines(journalDays, session.journal.length ? t('filter.none') : t('emptyJournal'))}
    {:else}
      <div class="lines totals">
        <span>{totals.line}<InfoTip markdown={t('tips.totals')} /></span>
        <span>{t('totals.checks', { count: totals.checks })}</span>
        {#if totals.taken}<span>{t('totals.taken', { list: totals.taken })}</span>{/if}
        {#if totals.spent}<span>{t('totals.spent', { list: totals.spent })}</span>{/if}
        {#if totals.gained}<span>{t('totals.gained', { list: totals.gained })}</span>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .rolls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
    font-size: 13px;
  }

  /* Waiting for who rolls: the line above, the choice and Continue under it. */
  .pending.asks > span {
    flex: 1 1 100%;
  }

  .pending .who {
    flex: 1;
  }

  .rolls .who {
    width: auto;
    flex: 1;
  }

  /* Ask at every roll: a line of its own, under who rolls. */
  .rolls .check {
    flex: 1 1 100%;
    display: flex;
    gap: 4px;
    align-items: center;
  }

  /* Skip pauses: a line of its own, under the buttons. */
  .givers {
    display: flex;
    flex: 1 1 100%;
    flex-wrap: wrap;
    gap: 4px 12px;
  }

  .givers label {
    display: flex;
    gap: 4px;
    align-items: center;
    color: var(--text);
  }

  .givers input {
    width: 4em;
  }

  .wrong {
    color: var(--danger);
  }

  .actions.held {
    opacity: 0.5;
  }

  .skip {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 0.9em;
  }

  /* What the last step did: a box of its own, under the buttons. */
  .last {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .last h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .last .journal {
    max-height: 200px;
  }

  /* The way of travelling: its name and its choice, on one line. */
  .mode .field {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    align-items: center;
  }

  .tabpanel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* The journal's filter, above its lines: what to show and Export on one line. */
  .filter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
    font-size: 12px;
  }

  .filter .level {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .export {
    margin-left: auto;
  }

  .topics {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    width: 100%;
  }

  .topics label {
    display: flex;
    gap: 4px;
    align-items: center;
    color: var(--text-muted);
  }

  .filter .search {
    width: 100%;
  }

  .link {
    padding: 0;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .link:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .trip {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* The party's stats under its sheet, each with where it comes from. */
  .stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .stat .source {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* A row each: its name, its number, where it comes from. */
  .stats .stat {
    display: grid;
    grid-template-columns: minmax(90px, 32%) 64px 1fr;
    align-items: center;
    gap: 8px;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    align-items: end;
    gap: 6px;
  }

  select,
  input[type='number'] {
    width: 100%;
    min-width: 0;
  }

  /* Made of the characters' values: shown, not edited here. */
  input[type='number']:disabled {
    opacity: 0.6;
  }

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

  .totals {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .status strong {
    color: var(--accent);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .actions button,
  .pending button {
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions .primary:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .actions button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* An action and the choices of its parameters, as one control: March · to the destination. */
  .take {
    display: inline-flex;
  }

  .take.joined button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .take select {
    max-width: 10em;
    padding: 0 4px;
    font-size: 12px;
    color: inherit;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-left: none;
    border-radius: 0;
  }

  .take select:last-child {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  .pending {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 6px 8px;
    color: var(--accent);
    border: 1px dashed var(--accent);
    border-radius: 6px;
  }

  .journal {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    margin: 0;
    padding: 0 var(--scroll-room) 0 0;
    overflow-y: auto;
    list-style: none;
  }

  .journal li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    color: var(--text);
    font-size: 12px;
  }

  .journal li.oracle span {
    color: var(--accent);
  }

  /* What happened behind: quieter than the story and the rules. */
  .journal li.detail span {
    color: var(--text-muted);
    font-size: 11px;
  }

  .journal li.day {
    display: block;
    margin-top: 4px;
    padding-bottom: 2px;
    font-weight: 600;
    color: var(--accent);
    border-bottom: 1px solid var(--panel-border);
  }

  .journal time {
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
