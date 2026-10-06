<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import type { JournalEntry } from '@open-tabletop/session'
  import { defaultCalendar, formatClock } from '@open-tabletop/time'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../lib/icons/registry'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
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
  import { getSystem, playSystems } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'
  import { AddAssetCommand } from '../lib/commands/assets'
  import { importImageFile, pickImageFiles } from '../lib/io/importImage'
  import { newId } from '../lib/model/id'
  import { showToast } from '../lib/store/toasts.svelte'

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

  const journal = $derived(session ? [...session.journal].reverse().slice(0, 40) : [])

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
        onclick={() => restartRules(play.rules?.system ?? 'generic', newSeason)}
        >{t('play.newTrip')}</button
      >
    </div>
    {#if !system.bindings}
      <p class="help">{t('play.noBindings')}</p>
    {/if}
  </div>

  {#if session && time}
    <div class="status">
      <strong>{t('play.dayLine', { day: time.day, clock: time.clock, season: time.season })}</strong
      >
      <span>{t('play.at', { hex: coord(session.travel.location) })}</span>
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
              >{t(`play.modes.${mode}` as MessageKey) === `play.modes.${mode}`
                ? mode
                : t(`play.modes.${mode}` as MessageKey)}</option
            >
          {/each}
        </select>
      </label>
      <label class="field" title={t('play.preHelp')}>
        <span>{t('play.pre')}</span>
        <input
          type="number"
          value={session.stats.pre ?? 0}
          onchange={(e) => {
            const pre = Number(e.currentTarget.value) || 0
            editSession((s) => ({ ...s, stats: { ...s.stats, pre } }))
          }}
        />
      </label>
    </div>
    <div class="row">
      {#each Object.keys(system.rules.resources ?? {}) as resource (resource)}
        <label class="field">
          <span
            >{t(`play.resources.${resource}` as MessageKey) === `play.resources.${resource}`
              ? resource
              : t(`play.resources.${resource}` as MessageKey)}</span
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
        <span>{t('play.fatigue')}</span>
        <input type="number" value={session.travel.fatigue} readonly />
      </label>
    </div>

    <div class="actions">
      <button
        class="primary"
        disabled={!session.travel.route}
        onclick={() => step({ type: 'travel' })}>{t('play.travel')}</button
      >
      <button
        disabled={!session.travel.route}
        onclick={() => step({ type: 'travel', until: 'hex' })}>{t('play.travelHex')}</button
      >
      <button onclick={() => step({ type: 'camp' })}>{t('play.camp')}</button>
      <button onclick={() => step({ type: 'rest', minutes: 480 })}>{t('play.rest')}</button>
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
        {#each journal as entry (entry.id)}
          <li class={entry.source}>
            <time>{entryClock(entry)}</time>
            <span>{entryText(entry)}</span>
          </li>
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
