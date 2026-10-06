<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { localize, type JournalEntry } from '@open-tabletop/session'
  import { defaultCalendar, formatClock } from '@open-tabletop/time'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../lib/icons/registry'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import {
    clearTrail,
    editSession,
    resetParty,
    resolvePending,
    restartRules,
    SEASON_START_DAYS,
    sessionOf,
    setMode,
    step,
    updatePlay,
    type Season,
  } from '../lib/play/play'
  import { oracleUi } from '../lib/play/oracle'
  import { getSystem, playSystems } from '../lib/play/systems'
  import { availableActions } from '@open-tabletop/travel-engine'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'
  import { InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { AddAssetCommand } from '../lib/commands/assets'
  import { importImageFile, pickImageFiles } from '../lib/io/importImage'
  import { newId } from '../lib/model/id'

  const customToken = $derived.by(() => {
    void editor.revision
    const id = play?.token.iconId
    return id?.startsWith('asset:')
      ? editor.map.assets.find((a) => `asset:${a.id}` === id)
      : undefined
  })

  /** Uploads an image as the party icon (stored as a map asset; no halo by default). */
  async function uploadToken() {
    const [file] = await pickImageFiles()
    if (!file) return
    const result = await importImageFile(file)
    if ('error' in result) {
      showToast(`${file.name}: ${t(`icons.error.${result.error}` as MessageKey)}`, 'error')
      return
    }
    const asset = { id: newId(), ...result }
    editor.execute(new AddAssetCommand(asset))
    updatePlay((p) => ({ ...p, token: { iconId: `asset:${asset.id}`, halo: false } }))
  }

  const partyIcons = BUILTIN_ICONS.filter((i) => i.category === 'party')
  const seasons = Object.keys(SEASON_START_DAYS) as Season[]

  const play = $derived(editor.play)
  const session = $derived(play ? sessionOf(play) : null)
  const system = $derived(getSystem(play?.rules?.system ?? 'generic'))
  const coord = (key: string) =>
    formatCoord(parseKey(key as HexKey), editor.grid.coordFormat, editor.grid)

  const time = $derived.by(() => {
    if (!session || !play?.rules) return null
    const parts = defaultCalendar.describe(session.travel.time)
    return {
      day: parts.day - play.rules.startDay + 1,
      clock: formatClock(parts),
      season: parts.season ? t(`play.seasons.${parts.season}` as MessageKey) : '',
    }
  })

  /** Newest first, grouped by day ("Day N" headers). */
  const journalDays = $derived.by(() => {
    if (!session || !play?.rules) return []
    const startDay = play.rules.startDay
    const groups: { day: number; entries: JournalEntry[] }[] = []
    for (const entry of [...session.journal].reverse().slice(0, 60)) {
      const day = defaultCalendar.describe(entry.time).day - startDay + 1
      if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] })
      groups.at(-1)!.entries.push(entry)
    }
    return groups
  })

  /** Marching hours used today vs. the rules' daily limit. */
  const marched = $derived.by(() => {
    if (!session) return null
    const used = session.travel.travelledToday
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
    localize(text, getLocale(), 'en') ?? key

  function label(key: string, fallback: string): string {
    const text = t(key as MessageKey)
    return text === key ? fallback : text
  }

  let newSeason = $state<Season>('spring')

  function eventName(event: unknown): string {
    const key = `play.events.${String(event)}` as MessageKey
    const text = t(key)
    return text === key ? String(event) : text
  }

  function entryText(e: JournalEntry): string {
    const d = (e.data ?? {}) as Record<string, unknown>
    switch (e.code) {
      case 'ORACLE_RESULT':
        return `${eventName(d.event)}: ${e.text ?? '—'}`
      case 'ORACLE_ROLL':
        return `${oracleUi.nameOf(String(d.table))}: ${e.text ?? '—'}`
      case 'CHECK_PENDING':
        return t('play.journal.pending', { event: eventName(d.event) })
      case 'HEX_ENTERED':
        return t('play.journal.entered', { hex: coord(String(d.hex)) })
      case 'DAY_STARTED':
        return t('play.journal.day', { day: Number(d.day) - (play?.rules?.startDay ?? 1) + 1 })
      case 'RESOURCE_DEPLETED':
        return t('play.journal.depleted', { resource: String(d.resource) })
      case 'TRAVEL_STOPPED':
        return t(`play.stop.${String(d.reason)}` as MessageKey)
      case 'NOTE':
        return e.text ?? ''
      default:
        return t(`play.journal.${e.code}` as MessageKey)
    }
  }

  function entryClock(e: JournalEntry): string {
    return formatClock(defaultCalendar.describe(e.time))
  }
</script>

<p class="help intro">{t('play.intro')}</p>

<div class="segmented" role="radiogroup" aria-label={t('play.mode')}>
  {#each ['simple', 'rules'] as const as mode (mode)}
    <button
      use:tooltip={t(`play.tips.${mode}` as MessageKey)}
      role="radio"
      aria-checked={(play?.mode ?? 'simple') === mode}
      class:active={(play?.mode ?? 'simple') === mode}
      onclick={() => setMode(mode)}>{t(`play.modes.${mode}` as MessageKey)}</button
    >
  {/each}
</div>

<div class="field">
  <span>{t('play.token')}</span>
  <div class="tokens">
    {#each partyIcons as icon (icon.id)}
      <button
        class:active={(play?.token.iconId ?? 'game:meeple') === icon.id}
        title={iconLabel(icon)}
        aria-label={iconLabel(icon)}
        onclick={() => updatePlay((p) => ({ ...p, token: { ...p.token, iconId: icon.id } }))}
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html builtinSvg(icon)}
      </button>
    {/each}
  </div>
  <div class="token-actions">
    <button class="secondary" onclick={uploadToken}>{t('play.uploadToken')}</button>
    {#if customToken}
      <img src={customToken.dataUrl} alt="" class="custom" />
    {/if}
  </div>
  {#if !customToken}
    <ColorPicker
      value={play?.token.color}
      auto
      onchange={(color) => updatePlay((p) => ({ ...p, token: { ...p.token, color } }))}
    />
  {/if}
</div>

<label class="check">
  <input
    type="checkbox"
    checked={play?.token.halo !== false}
    onchange={(e) => {
      const halo = e.currentTarget.checked
      updatePlay((p) => ({ ...p, token: { ...p.token, halo } }))
    }}
  />
  {t('iconStyle.halo')}
</label>

<label class="check">
  <input
    type="checkbox"
    checked={play?.showTrail ?? true}
    onchange={(e) => updatePlay((p) => ({ ...p, showTrail: e.currentTarget.checked }))}
  />
  {t('play.showTrail')}
</label>

{#if !play?.location}
  <p class="help">{t('play.placeHelp')}</p>
{:else if play.mode === 'simple'}
  <p class="help">{t('play.simpleHelp', { hex: coord(play.location) })}</p>
{/if}

{#if play?.mode === 'rules'}
  <div class="group">
    <label class="field">
      <span>{t('play.system')}</span>
      <select
        value={play.rules?.system ?? 'generic'}
        onchange={(e) => restartRules(e.currentTarget.value, newSeason)}
      >
        {#each playSystems() as s (s.id)}
          <option value={s.id}>{s.id === 'generic' ? t('play.genericSystem') : s.name}</option>
        {/each}
      </select>
    </label>
    <div class="row">
      <label class="field">
        <span>{t('play.startSeason')}</span>
        <select bind:value={newSeason}>
          {#each seasons as season (season)}
            <option value={season}>{t(`play.seasons.${season}` as MessageKey)}</option>
          {/each}
        </select>
      </label>
      <button
        class="secondary"
        use:tooltip={t('play.tips.newTrip')}
        onclick={() => restartRules(play.rules?.system ?? 'generic', newSeason)}
        >{t('play.newTrip')}</button
      >
    </div>
    <p class="help">{system.bindings ? t('play.withTables') : t('play.noBindings')}</p>
  </div>

  {#if session && time}
    <div class="status">
      <strong>{t('play.dayLine', { day: time.day, clock: time.clock, season: time.season })}</strong
      >
      <span>{t('play.at', { hex: coord(session.travel.location) })}</span>
      {#if marched}
        <span
          >{t('play.marched', { used: marched.used, limit: marched.limit })}<InfoTip
            text={t('play.tips.marched')}
          /></span
        >
      {/if}
      {#if session.travel.weather}
        <span>{t('play.weather', { weather: session.travel.weather.replaceAll('-', ' ') })}</span>
      {/if}
      {#if session.travel.destination && session.travel.destination === session.travel.location}
        <span>{t('play.arrived')}</span>
      {:else if session.travel.destination}
        <span>{t('play.destination', { hex: coord(session.travel.destination) })}</span>
      {:else}
        <span class="help">{t('play.destinationHelp')}</span>
      {/if}
    </div>

    <div class="row">
      <label class="field">
        <span>{t('play.travelMode')}</span>
        <select
          value={session.travel.mode}
          onchange={(e) => {
            const mode = e.currentTarget.value
            editSession((s) => ({ ...s, travel: { ...s.travel, mode } }))
          }}
        >
          {#each Object.keys(system.rules.modes) as mode (mode)}
            <option value={mode}
              >{label(`play.modes.${mode}`, mode)} ({system.rules.modes[mode].kmPerDay} km/{t(
                'play.dayUnit',
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
            >{label(`play.resources.${resource}`, resource)}<InfoTip
              text={t('play.tips.resource', {
                perDay: system.rules.resources?.[resource]?.perDay ?? 0,
              })}
            /></span
          >
          <input
            type="number"
            min="0"
            value={session.travel.resources[resource] ?? 0}
            onchange={(e) => {
              const amount = Math.max(0, Number(e.currentTarget.value) || 0)
              editSession((s) => ({
                ...s,
                travel: { ...s.travel, resources: { ...s.travel.resources, [resource]: amount } },
              }))
            }}
          />
        </label>
      {/each}
      <label class="field">
        <span>{t('play.fatigue')}<InfoTip text={t('play.tips.fatigue')} /></span>
        <input
          type="number"
          min="0"
          value={session.travel.fatigue}
          onchange={(e) => {
            const fatigue = Math.max(0, Math.round(Number(e.currentTarget.value) || 0))
            editSession((s) => ({ ...s, travel: { ...s.travel, fatigue } }))
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
            editSession((s) => ({ ...s, stats: { ...s.stats, [key]: value } }))
          }}
        />
      </label>
    {/each}

    <div class="actions">
      <button
        class="primary"
        use:tooltip={t('play.tips.travel')}
        disabled={!session.travel.route}
        onclick={() => step({ type: 'travel' })}>{t('play.travel')}</button
      >
      <button
        use:tooltip={t('play.tips.travelHex')}
        disabled={!session.travel.route}
        onclick={() => step({ type: 'travel', until: 'hex' })}>{t('play.travelHex')}</button
      >
      {#if actions.camp}
        <button use:tooltip={t('play.tips.camp')} onclick={() => step({ type: 'camp' })}
          >{t('play.camp')}</button
        >
      {/if}
      {#if actions.rest}
        <button
          use:tooltip={t(actions.rest.fatigue ? 'play.tips.restRecovers' : 'play.tips.rest')}
          onclick={() => step({ type: 'rest' })}>{t('play.rest', { length: restLength })}</button
        >
      {/if}
    </div>

    {#each session.travel.pendingChecks as check (check.id)}
      <div class="pending">
        <span>{t('play.journal.pending', { event: eventName(check.event) })}</span>
        <button onclick={() => resolvePending(check.id)}>{t('play.continue')}</button>
      </div>
    {/each}

    <div class="field">
      <span>{t('play.journalTitle')}</span>
      <ol class="journal">
        {#each journalDays as group (group.day)}
          <li class="day">{t('play.journalDay', { day: group.day })}</li>
          {#each group.entries as entry (entry.id)}
            <li class={entry.source}>
              <time>{entryClock(entry)}</time>
              <span>{entryText(entry)}</span>
            </li>
          {/each}
        {:else}
          <li class="help">{t('play.emptyJournal')}</li>
        {/each}
      </ol>
    </div>
  {/if}
{/if}

{#if play?.location}
  <div class="actions">
    <button onclick={clearTrail}>{t('play.clearTrail')}</button>
    <button class="danger" onclick={resetParty}>{t('play.removeParty')}</button>
  </div>
{/if}

<style>
  .segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .segmented button,
  .actions button,
  .pending button,
  .secondary {
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .segmented button.active,
  .actions .primary:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .actions button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .tokens {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
  }

  .tokens button {
    aspect-ratio: 1;
    padding: 4px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .tokens button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .tokens :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .token-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .custom {
    width: 34px;
    height: 34px;
    object-fit: contain;
    border: 1px solid var(--accent);
    border-radius: 6px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
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

  .danger:hover {
    color: var(--danger);
    border-color: var(--danger);
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

  .intro {
    padding-bottom: 4px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
