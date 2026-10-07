<script lang="ts">
  import {
    localize,
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
    resourceBounds,
    checkInfo,
    declaredValues,
    type TravelAction,
    type TravelWorld,
    type Unavailable,
  } from '@open-tabletop/travel-engine'
  import { calendarOf } from '@open-tabletop/session'
  import { InfoTip, tooltip, type TooltipText } from '@open-tabletop/ui-kit'
  import { idText, translator, type TravelUiKey } from './i18n'

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
    world,
    onstep,
    onedit,
  }: {
    system: TravelSystem
    session: SessionState
    /** The map, for actions whose conditions read it (terrain, tags…). */
    world?: TravelWorld
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

  /** The system's declared stats only: nothing it doesn't declare is shown. */
  const stats = $derived<[string, StatDefinition][]>(Object.entries(system.bindings?.stats ?? {}))
  const actions = $derived(availableActions(system.rules))
  const bounds = $derived(resourceBounds(system.rules))
  /** The buttons: every action but those the system takes by itself (`on:`). */
  const buttons = $derived(Object.keys(actions.all).filter((id) => !actions.all[id].on))
  /** An action's button: its name, and how long it lasts when that's fixed ("Rest (2 h)"). */
  const buttonText = (id: string) => {
    const minutes = actionMinutes(actions.all[id])
    return minutes ? `${actionName(id)} (${durationText(minutes)})` : actionName(id)
  }
  /** What can't be done now (travel, actions) and why. */
  const blocked = $derived(tripAvailability({ system, world }, session))
  /** The values of the day the system declares, by their names (lost: Lost). */
  const dayValues = $derived(
    Object.fromEntries(
      Object.entries(declaredValues(system.rules)).map(([id, v]) => [
        id,
        localize(v.name, locale, 'en') ?? idText(t, `values.${id}`, id),
      ]),
    ),
  )
  /** Why a button is disabled, in words ('' when it isn't). */
  const why = (because: Unavailable | undefined): string => whyText(because, { t, dayValues })
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
    const until = always.find((st) => st.time === 'dawn' || st.time === 'nightfall')?.time as
      'dawn' | 'nightfall' | undefined
    const speed = always.find((st) => st.speed !== undefined)?.speed
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
      !fallback && until ? t('tips.actionUntil', { moment: t(`tips.${until}`) }) : '',
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

  <div class="row">
    <label class="field">
      <span>{t('travelMode')}</span>
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
  <div class="row">
    {#each Object.keys(system.rules.resources ?? {}) as resource (resource)}
      <label class="field">
        <span
          >{resourceName(resource)}<InfoTip
            markdown={[
              localize(system.rules.resources?.[resource]?.description, locale, 'en'),
              t('tips.resource'),
              bounds[resource]?.min !== undefined && t('tips.min', { min: bounds[resource].min! }),
              bounds[resource]?.max !== undefined && t('tips.max', { max: bounds[resource].max! }),
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

  {#each stats as [key, stat] (key)}
    <label class="field">
      <span
        >{statText(stat.name, key)}<InfoTip
          markdown={[statText(stat.description, ''), readAs(key, `party.stats.${key}`)]
            .filter(Boolean)
            .join('\n\n')}
        /></span
      >
      <input
        type="number"
        value={session.stats[key] ?? stat.default ?? 0}
        onchange={(e) => {
          const value = Number(e.currentTarget.value) || 0
          onedit((s) => ({ ...s, stats: { ...s.stats, [key]: value } }))
        }}
      />
    </label>
  {/each}

  <div class="actions">
    <button
      class="primary"
      use:tooltip={tipWith(t('tips.travel'), 'travel')}
      disabled={!travel.route || !!blocked.travel}
      onclick={() => onstep({ type: 'travel' })}>{t('travel')}</button
    >
    <button
      use:tooltip={tipWith(t('tips.travelHex'), 'travel')}
      disabled={!travel.route || !!blocked.travel}
      onclick={() => onstep({ type: 'travel', until: 'hex' })}>{t('travelHex')}</button
    >
    {#each buttons as id (id)}
      <button
        use:tooltip={tipWith(actionTip(id), id)}
        disabled={!!blocked[id]}
        onclick={() => onstep({ type: 'action', id })}>{buttonText(id)}</button
      >
    {/each}
  </div>

  {#each travel.pendingChecks as check (check.id)}
    <div class="pending">
      <span
        >{t(check.rolled ? 'journal.paused' : 'journal.pending', {
          event: pendingName(check.event),
        })}{#if checkTip(check.event)}<InfoTip markdown={checkTip(check.event)} />{/if}</span
      >
      <button onclick={() => onstep({ type: 'resolveCheck', id: check.id })}>{t('continue')}</button
      >
    </div>
  {/each}

  <div class="field">
    <div class="journal-head">
      <span>{t('journalTitle')}</span>
      <button
        class="link"
        use:tooltip={t('tips.exportJournal')}
        disabled={!session.journal.length}
        onclick={exportJournal}>{t('exportJournal')}</button
      >
    </div>
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
  </div>
</div>

<style>
  .journal-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
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

  .pending {
    display: flex;
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
