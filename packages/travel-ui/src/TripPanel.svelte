<script lang="ts">
  import {
    localize,
    editPartySheet,
    partyOf,
    picksWho,
    tripAvailability,
    type JournalEntry,
    type SessionState,
    type StatDefinition,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { formatClock } from '@open-tabletop/time'
  import {
    changesText,
    durationText,
    entryClock,
    entryText,
    eventName,
    journalMarkdown,
    tripDay,
    whyText,
  } from './journal'
  import {
    actionMinutes,
    actionSteps,
    availableActions,
    isClock,
    isPartRef,
    movingActions,
    noTotals,
    paramDefault,
    resourceBounds,
    checkInfo,
    declaredValues,
    type ActionParam,
    type ParamChoice,
    type TravelAction,
    type TravelWorld,
    type Unavailable,
  } from '@open-tabletop/travel-engine'
  import { calendarOf } from '@open-tabletop/session'
  import { InfoTip, tooltip, type TooltipText } from '@open-tabletop/ui-kit'
  import { idText, translator, type TravelUiKey } from './i18n'
  import { memberNamer } from './members'
  import { dayPartsLine, divisionName, partName } from './dayParts'
  import { findPart } from '@open-tabletop/time'
  import Fold from './Fold.svelte'
  import PartyMembers from './PartyMembers.svelte'
  import { CharacterCard } from '@open-tabletop/character-ui'

  /**
   * A trip in progress: day and time, where the party is and where it's heading, travel
   * mode, supplies, fatigue and stats, the system's actions, pending checks and journal.
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
    onstep,
    onedit,
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
    /** Changes the session directly (supplies, stats, mode) without a travel step. */
    onedit: (update: (session: SessionState) => SessionState) => void
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
    const hexKm = world?.hexKm ?? system.rules.travel.hexKm
    const km = hexKm === undefined ? '' : Math.round(all.hexes * hexKm * 10) / 10
    const list = (counts: Record<string, number>, name: (id: string) => string) =>
      Object.entries(counts)
        .filter(([, n]) => n)
        .map(([id, n]) => `${name(id)} ${Math.round(n * 100) / 100}`)
        .join(' · ')
    return {
      title: t('totals.title', {
        hexes: all.hexes,
        km: km === '' ? '' : t('totals.km', { km }),
        hours: `${Math.floor(all.marched / 60)} h ${String(Math.round(all.marched % 60)).padStart(2, '0')}`,
      }),
      checks: all.checks,
      taken: list(all.taken, actionName),
      spent: list(all.spent, resourceName),
      gained: list(all.gained, resourceName),
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
        travel: { ...s.travel, resources: { ...s.travel.resources } },
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
  const bounds = $derived(resourceBounds(system.rules))
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
  const main = $derived(goingOn ? undefined : (onward?.do ?? buttons.find((id) => movers.has(id))))

  /** The choices made in each action's parameters, by action and parameter (none: its default). */
  let chosen = $state<Record<string, Record<string, string>>>({})
  const choiceId = (c: ParamChoice) => (typeof c === 'object' ? c.id : c)
  /** A choice in words: its name, or what a move's target says ("to the destination", "3 hexes"). */
  const choiceName = (c: ParamChoice) => {
    const named = typeof c === 'object' ? localize(c.name, locale, 'en') : undefined
    if (named) return named
    const id = String(choiceId(c))
    if (id === 'destination' || id === 'hex') return t(`choices.${id}`)
    return /^\d+$/.test(id) ? t('choices.hexes', { n: id }) : id.replaceAll('-', ' ')
  }
  const paramName = (key: string, param: ActionParam) => localize(param.name, locale, 'en') ?? key
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
  const memberName = $derived(memberNamer(system, session.members, locale, t, facts))
  /** Why a button is disabled, in words ('' when it isn't). */
  const why = (because: Unavailable | undefined): string =>
    whyText(because, { t, dayValues, memberName })
  /** With characters, the stats made of theirs and the supplies they carry follow them. */
  const hasMembers = $derived(!!system.sheet && !!session.members?.length)
  const fromMembers = (stat: StatDefinition) => hasMembers && !!stat.from
  const carried = (resource: string) => hasMembers && !!system.bindings?.resources?.[resource]
  /** What a condition blocks, in words: an action, travel or a way of travelling. */
  const blockName = (id: string) =>
    id === 'travel' ? t('travel') : id.startsWith('mode.') ? modeName(id.slice(5)) : actionName(id)
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
   * Names the system gives its ways of travelling and supplies (the app's dictionary only
   * names the Generic rules' ones, then the id made readable).
   */
  const modeName = (id: string) =>
    localize(system.rules.modes[id]?.name, locale, 'en') ?? idText(t, `modes.${id}`, id)
  const resourceName = (id: string) =>
    localize(system.rules.resources?.[id]?.name, locale, 'en') ?? idText(t, `resources.${id}`, id)

  /** What an action or a rest changes, as words: "Morale +1" (from its effects). */
  function changes(own: unknown): string {
    if (typeof own !== 'object' || own === null) return ''
    const o = own as { effects?: Record<string, number | string>; fatigue?: number }
    const effects = { ...(o.fatigue ? { 'party.stats.fatigue': -o.fatigue } : {}), ...o.effects }
    return Object.keys(effects).length ? changesText({ effects }, context) : ''
  }

  /** How tables read a value, for its tooltip: "Tables read it as `{{survival}}`…". */
  const readAs = (...keys: string[]) =>
    t('tips.readAs', { keys: keys.map((k) => '`{{' + k + '}}`').join(' · ') })

  /** Name of a value results change: a stat of the system, fatigue or a resource. */
  const valueName = (key: string) => {
    const stat = system.bindings?.stats?.[key]
    if (stat) return statText(stat.name, key)
    if (key === 'fatigue') return t('fatigue')
    return resourceName(key)
  }
  /** What an action that rolled nothing says: its own text, '' without checks, or generic. */
  const actionNothing = (id: string) => {
    if (!(system.rules.checks ?? []).some((c) => c.at === id)) return ''
    return localize(actions.all[id]?.nothing, locale, 'en')
  }
  const context = $derived({
    t,
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
    /** Until a clock (`06:00`) or a part of the calendar's day (its name: "until supper"). */
    const untilText = (moment: string) => {
      if (!isPartRef(moment)) return moment
      const found = findPart(calendar.divisions ?? [], moment)
      return found
        ? `${divisionName(found.division, locale, t('watches'))}: ${partName(found.division, found.part, locale)}`
        : moment
    }
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

  /** Newest first, grouped by day ("Day N" headers). */
  const journalDays = $derived.by(() => {
    const groups: { day: number; entries: JournalEntry[] }[] = []
    for (const entry of [...session.journal].reverse().slice(0, 60)) {
      const day = tripDay(entry, startDay, calendar)
      if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] })
      groups.at(-1)!.entries.push(entry)
    }
    return groups
  })

  function exportJournal() {
    const markdown = journalMarkdown(session.journal, context, title || t('journalTitle'))
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title || 'journal').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const number = (value: string, min = 0) => Math.max(min, Number(value) || 0)
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
            event: pendingName(check.event),
          },
        )}{#if checkTip(check.event)}<InfoTip markdown={checkTip(check.event)} />{/if}</span
      >
      {#if session.asking?.includes(check.id)}{@render whoRolls()}{/if}
      <button onclick={() => onstep({ type: 'resolveCheck', id: check.id })}>{t('continue')}</button
      >
    </div>
  {/each}

  <div class="actions">
    {#if goingOn}
      <button
        class="primary"
        use:tooltip={tipWith(t('tips.goOn', { action: actionName(goingOn) }), 'travel')}
        disabled={!!blocked.travel}
        onclick={() => onstep({ type: 'travel' })}>{t('goOn')}</button
      >
    {/if}
    {#each buttons as id (id)}
      {@const params = Object.entries(actions.all[id].params ?? {})}
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
        use:tooltip={travel.pendingChecks.length
          ? tipWith(t('tips.waitOnward', { action: actionName(onward.do) }), 'travel')
          : t('tips.waitOnward', { action: actionName(onward.do) })}
        disabled={travel.pendingChecks.length > 0}
        onclick={() => onstep({ type: 'waitForMarch' })}>{t('waitOnward')}</button
      >
    {/if}
  </div>

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
  {#if choosesWho}
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
  {/if}

  <div class="row">
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
  <!-- The sections below fold by their heading (remembered per viewer); the status, what
       waits for Continue and the buttons above never do. -->
  {#if Object.keys(system.rules.resources ?? {}).length}
    <Fold id="supplies" title={t('fold.supplies')} {locale}>
      <div class="row">
        {#each Object.keys(system.rules.resources ?? {}) as resource (resource)}
          <label class="field">
            <span
              >{resourceName(resource)}<InfoTip
                markdown={[
                  localize(system.rules.resources?.[resource]?.description, locale, 'en'),
                  t('tips.resource'),
                  bounds[resource]?.min !== undefined &&
                    t('tips.min', { min: bounds[resource].min! }),
                  bounds[resource]?.max !== undefined &&
                    t('tips.max', { max: bounds[resource].max! }),
                  carried(resource) && t('members.carried'),
                  readAs(`party.resources.${resource}`),
                ]
                  .filter(Boolean)
                  .join('\n\n')}
              /></span
            >
            <input
              type="number"
              min="0"
              value={travel.resources[resource] ?? 0}
              disabled={carried(resource)}
              onchange={(e) => {
                const amount = number(e.currentTarget.value)
                onedit((s) => ({
                  ...s,
                  travel: { ...s.travel, resources: { ...s.travel.resources, [resource]: amount } },
                }))
              }}
            />
          </label>
        {/each}
      </div>
    </Fold>
  {/if}

  {#if stats.length}
    <Fold id="stats" title={t('fold.stats')} {locale}>
      {#each stats as [key, stat] (key)}
        <label class="field">
          <span
            >{statText(stat.name, key)}<InfoTip
              markdown={[
                statText(stat.description, ''),
                fromMembers(stat) && t('members.fromMembers'),
                readAs(key, `party.stats.${key}`),
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
        </label>
      {/each}
    </Fold>
  {/if}

  {#if system.partySheet && session.party}
    <Fold id="party" title={t('partySheet.title')} help={t('partySheet.help')} {locale}>
      <CharacterCard
        sheet={system.partySheet.def}
        character={session.party}
        {locale}
        names={blockName}
        path="party"
        time={session.travel.time}
        named={false}
        onchange={editParty}
      />
    </Fold>
  {/if}

  {#if system.sheet}
    <PartyMembers
      system={{ ...system, sheet: system.sheet }}
      {session}
      {locale}
      names={blockName}
      targets={relationTargets}
      {onedit}
    />
  {/if}

  <Fold id="totals" title={totals.title} help={t('tips.totals')} start={false} {locale}>
    <div class="lines totals">
      <span>{t('totals.checks', { count: totals.checks })}</span>
      {#if totals.taken}<span>{t('totals.taken', { list: totals.taken })}</span>{/if}
      {#if totals.spent}<span>{t('totals.spent', { list: totals.spent })}</span>{/if}
      {#if totals.gained}<span>{t('totals.gained', { list: totals.gained })}</span>{/if}
    </div>
  </Fold>

  <Fold id="journal" title={t('journalTitle')} {locale}>
    {#snippet head()}
      <button
        class="link export"
        use:tooltip={t('tips.exportJournal')}
        disabled={!session.journal.length}
        onclick={exportJournal}>{t('exportJournal')}</button
      >
    {/snippet}
    <ol class="journal">
      {#each journalDays as group (group.day)}
        <li class="day">{t('journalDay', { day: group.day })}</li>
        {#each group.entries as entry (entry.id)}
          <li class={entry.source}>
            <time>{entryClock(entry, calendar)}</time>
            <span>{text(entry)}</span>
          </li>
        {/each}
      {:else}
        <li class="help">{t('emptyJournal')}</li>
      {/each}
    </ol>
  </Fold>
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

  /* The journal's Export, at the end of its heading's line. */
  .export {
    margin-left: auto;
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
    padding-left: 14px;
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
