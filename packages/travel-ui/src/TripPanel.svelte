<script lang="ts">
  import {
    localize,
    type JournalEntry,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { defaultCalendar, formatClock } from '@open-tabletop/time'
  import { entryClock, entryText, eventName, journalMarkdown, tripDay } from './journal'
  import { availableActions, checkInfo, type TravelAction } from '@open-tabletop/travel-engine'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
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
    nameOf = (id) => id,
    destinationHint = '',
    arrivedHint = '',
    title = '',
    onstep,
    onedit,
  }: {
    system: TravelSystem
    session: SessionState
    /** Calendar day the trip started (shown as day 1). */
    startDay: number
    locale: string
    hexLabel?: (hex: string) => string
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

  const time = $derived.by(() => {
    const parts = defaultCalendar.describe(travel.time)
    return {
      day: parts.day - startDay + 1,
      clock: formatClock(parts),
      season: parts.season ? t(`seasons.${parts.season}` as TravelUiKey) : '',
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

  const stats = $derived(Object.entries(system.bindings?.stats ?? {}))
  const actions = $derived(availableActions(system.rules))
  const restLength = $derived.by(() => {
    const minutes = actions.rest?.minutes ?? 0
    return minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`
  })
  const statText = (text: Parameters<typeof localize>[0], key: string) =>
    localize(text, locale, 'en') ?? key

  const actionName = (id: string) =>
    localize(actions.custom[id]?.name, locale, 'en') ?? idText(t, `actions.${id}`, id)
  const checkName = (event: string) => localize(checkInfo(system.rules, event).name, locale, 'en')
  const checkTip = (event: string) =>
    localize(checkInfo(system.rules, event).description, locale, 'en') ?? ''
  const context = $derived({ t, startDay, hexLabel, nameOf, actionName, checkName })
  /** What an action of the system's own does, for its tooltip. */
  function actionTip(id: string): string {
    const own = actions.custom[id]
    const described = localize(own.description, locale, 'en')
    if (described) return described
    const parts = [
      own.minutes ? t('tips.actionTime', { minutes: own.minutes }) : '',
      own.speed !== undefined ? t('tips.actionSpeed', { speed: own.speed }) : '',
      own.fatigue ? t('tips.actionFatigue', { fatigue: own.fatigue }) : '',
      own.oncePerDay ? t('tips.actionOnce') : '',
    ]
    return parts.filter(Boolean).join(' ')
  }
  const doneToday = (id: string) =>
    !!actions.custom[id]?.oncePerDay && !!travel.actionsToday?.includes(id)
  const text = (e: JournalEntry) => entryText(e, context)
  const pendingName = (event: unknown) => eventName(t, event, checkName)

  /** Newest first, grouped by day ("Day N" headers). */
  const journalDays = $derived.by(() => {
    const groups: { day: number; entries: JournalEntry[] }[] = []
    for (const entry of [...session.journal].reverse().slice(0, 60)) {
      const day = tripDay(entry, startDay)
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
          <option value={mode}
            >{idText(t, `modes.${mode}`, mode)} ({system.rules.modes[mode].kmPerDay} km/{t(
              'dayUnit',
            )})</option
          >
        {/each}
      </select>
    </label>
  </div>
  <div class="row">
    {#each Object.keys(system.rules.resources ?? {}) as resource (resource)}
      <label class="field">
        <span
          >{idText(t, `resources.${resource}`, resource)}<InfoTip
            text={t('tips.resource', { perDay: system.rules.resources?.[resource]?.perDay ?? 0 })}
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
    <label class="field">
      <span>{t('fatigue')}<InfoTip text={t('tips.fatigue')} /></span>
      <input
        type="number"
        min="0"
        value={travel.fatigue}
        onchange={(e) => {
          const fatigue = Math.round(number(e.currentTarget.value))
          onedit((s) => ({ ...s, travel: { ...s.travel, fatigue } }))
        }}
      />
    </label>
  </div>

  {#each stats as [key, stat] (key)}
    <label class="field">
      <span>{statText(stat.name, key)}<InfoTip text={statText(stat.description, '')} /></span>
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
      use:tooltip={t('tips.travel')}
      disabled={!travel.route}
      onclick={() => onstep({ type: 'travel' })}>{t('travel')}</button
    >
    <button
      use:tooltip={t('tips.travelHex')}
      disabled={!travel.route}
      onclick={() => onstep({ type: 'travel', until: 'hex' })}>{t('travelHex')}</button
    >
    {#if actions.camp}
      <button use:tooltip={t('tips.camp')} onclick={() => onstep({ type: 'camp' })}
        >{t('camp')}</button
      >
    {/if}
    {#if actions.rest}
      <button
        use:tooltip={t(actions.rest.fatigue ? 'tips.restRecovers' : 'tips.rest')}
        onclick={() => onstep({ type: 'rest' })}>{t('rest', { length: restLength })}</button
      >
    {/if}
    {#each Object.keys(actions.custom) as id (id)}
      <button
        use:tooltip={actionTip(id)}
        disabled={doneToday(id)}
        onclick={() => onstep({ type: 'action', id })}>{actionName(id)}</button
      >
    {/each}
  </div>

  {#each travel.pendingChecks as check (check.id)}
    <div class="pending">
      <span
        >{t('journal.pending', {
          event: pendingName(check.event),
        })}{#if checkTip(check.event)}<InfoTip text={checkTip(check.event)} />{/if}</span
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
            <time>{entryClock(entry)}</time>
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
    padding: 0;
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
