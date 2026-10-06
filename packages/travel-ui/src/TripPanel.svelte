<script lang="ts">
  import {
    localize,
    type JournalEntry,
    type SessionState,
    type TravelSystem,
  } from '@open-tabletop/session'
  import { defaultCalendar, formatClock } from '@open-tabletop/time'
  import { availableActions, type TravelAction } from '@open-tabletop/travel-engine'
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

  const eventName = (event: unknown) => idText(t, `events.${String(event)}`, String(event))

  /** Newest first, grouped by day ("Day N" headers). */
  const journalDays = $derived.by(() => {
    const groups: { day: number; entries: JournalEntry[] }[] = []
    for (const entry of [...session.journal].reverse().slice(0, 60)) {
      const day = defaultCalendar.describe(entry.time).day - startDay + 1
      if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] })
      groups.at(-1)!.entries.push(entry)
    }
    return groups
  })

  function entryText(e: JournalEntry): string {
    const d = (e.data ?? {}) as Record<string, unknown>
    switch (e.code) {
      case 'ORACLE_RESULT':
        return `${eventName(d.event)}: ${e.text ?? '—'}`
      case 'ORACLE_ROLL':
        return `${nameOf(String(d.table))}: ${e.text ?? '—'}`
      case 'CHECK_PENDING':
        return t('journal.pending', { event: eventName(d.event) })
      case 'DISCOVERY_FAILED':
        return t('journal.discoveryFailed', { hex: hexLabel(String(d.hex)), error: e.text ?? '' })
      case 'CHECK_FAILED':
        return t('journal.failed', { event: eventName(d.event), error: e.text ?? '' })
      case 'HEX_ENTERED':
        return t('journal.entered', { hex: hexLabel(String(d.hex)) })
      case 'HEX_DISCOVERED':
        return t('journal.discovered', { hex: hexLabel(String(d.hex)), what: e.text ?? '—' })
      case 'DAY_STARTED':
        return t('journal.day', { day: Number(d.day) - startDay + 1 })
      case 'RESOURCE_DEPLETED':
        return t('journal.depleted', {
          resource: idText(t, `resources.${d.resource}`, String(d.resource)),
        })
      case 'TRAVEL_STOPPED':
        return t(`stop.${String(d.reason)}` as TravelUiKey)
      case 'NOTE':
        return e.text ?? ''
      default:
        return idText(t, `journal.${e.code}`, e.code)
    }
  }

  const entryClock = (e: JournalEntry) => formatClock(defaultCalendar.describe(e.time))
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
  </div>

  {#each travel.pendingChecks as check (check.id)}
    <div class="pending">
      <span>{t('journal.pending', { event: eventName(check.event) })}</span>
      <button onclick={() => onstep({ type: 'resolveCheck', id: check.id })}>{t('continue')}</button
      >
    </div>
  {/each}

  <div class="field">
    <span>{t('journalTitle')}</span>
    <ol class="journal">
      {#each journalDays as group (group.day)}
        <li class="day">{t('journalDay', { day: group.day })}</li>
        {#each group.entries as entry (entry.id)}
          <li class={entry.source}>
            <time>{entryClock(entry)}</time>
            <span>{entryText(entry)}</span>
          </li>
        {/each}
      {:else}
        <li class="help">{t('emptyJournal')}</li>
      {/each}
    </ol>
  </div>
</div>

<style>
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
