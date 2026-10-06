<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { TripPanel, TripSetup } from '@open-tabletop/travel-ui'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import {
    clearTrail,
    editSession,
    resetParty,
    restartRules,
    sessionOf,
    setDiscover,
    setMode,
    step,
    updatePlay,
    type Season,
  } from '../lib/play/play'
  import { oracleUi } from '../lib/play/oracle'
  import { getSystem, playSystems } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'
  import TokenIconPicker from './tokens/TokenIconPicker.svelte'
  import { InfoTip, tooltip, confirmAction } from '@open-tabletop/ui-kit'
  import { AddTokenCommand } from '../lib/commands/tokens'
  import { newId } from '../lib/model/id'
  import { DEFAULT_TOKEN_ICONS } from '../lib/model/tokens'
  import type { MapToken } from '../lib/model/types'

  /** The party is a token: its look is edited here, its position by playing. */
  const party = $derived(editor.tokens.find((t) => t.kind === 'party'))

  function editParty(change: (token: MapToken) => MapToken) {
    if (party) return editor.updateToken(party.id, change)
    const token: MapToken = {
      id: newId(),
      name: '',
      kind: 'party',
      iconId: DEFAULT_TOKEN_ICONS.party,
    }
    editor.execute(new AddTokenCommand(change(token)))
  }

  const play = $derived(editor.play)
  const session = $derived(play ? sessionOf(play) : null)
  const system = $derived(getSystem(play?.rules?.system ?? 'generic'))
  const coord = (key: string) =>
    formatCoord(parseKey(key as HexKey), editor.grid.coordFormat, editor.grid)

  let newSeason = $state<Season>('spring')
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
  <TokenIconPicker
    value={party?.iconId ?? DEFAULT_TOKEN_ICONS.party}
    onchange={(iconId) => iconId && editParty((t) => ({ ...t, iconId }))}
  />
  <ColorPicker
    value={party?.color}
    auto
    onchange={(color) => editParty((t) => ({ ...t, color }))}
  />
</div>

<label class="check">
  <input
    type="checkbox"
    checked={party?.halo !== false}
    onchange={(e) => {
      const halo = e.currentTarget.checked
      editParty((t) => ({ ...t, halo: halo ? undefined : false }))
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

{#if !party?.hex}
  <p class="help">{t('play.placeHelp')}</p>
{:else if (play?.mode ?? 'simple') === 'simple'}
  <p class="help">{t('play.simpleHelp', { hex: coord(party.hex) })}</p>
{/if}

{#if play?.mode === 'rules'}
  <TripSetup
    systems={playSystems()}
    system={play.rules?.system ?? 'generic'}
    locale={getLocale()}
    bind:season={newSeason}
    onrestart={async (system, season) =>
      (!session || (await confirmAction(t('play.confirmNewTrip')))) && restartRules(system, season)}
  />
  {#if system.bindings?.discover}
    {@const discover = play.discover}
    <div class="discover">
      <label class="check">
        <input
          type="checkbox"
          checked={!!discover?.on}
          onchange={(e) => setDiscover({ ...discover, on: e.currentTarget.checked })}
        />
        {t('play.discover')}
        <InfoTip text={t('play.discoverHelp')} />
      </label>
      {#if discover?.on}
        <select
          aria-label={t('play.reveal')}
          value={discover.reveal ?? system.bindings.discover.reveal}
          onchange={(e) =>
            setDiscover({
              on: true,
              reveal: e.currentTarget.value as 'neighbors' | 'entered',
            })}
        >
          <option value="neighbors">{t('play.revealNeighbors')}</option>
          <option value="entered">{t('play.revealEntered')}</option>
        </select>
      {/if}
    </div>
  {/if}
  {#if session && play.rules}
    <TripPanel
      {system}
      {session}
      startDay={play.rules.startDay}
      locale={getLocale()}
      hexLabel={coord}
      nameOf={oracleUi.nameOf}
      destinationHint={t('play.destinationHelp')}
      arrivedHint={t('play.newDestination')}
      onstep={step}
      onedit={editSession}
    />
  {/if}
{/if}

{#if party?.hex}
  <div class="actions">
    <button onclick={async () => (await confirmAction(t('play.confirmClearTrail'))) && clearTrail()}
      >{t('play.clearTrail')}</button
    >
    <button
      class="danger"
      onclick={async () =>
        (await confirmAction(
          t(session ? 'play.confirmRemovePartyTrip' : 'play.confirmRemoveParty'),
        )) && resetParty()}>{t('play.removeParty')}</button
    >
  </div>
{/if}

<style>
  .segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .segmented button,
  .actions button {
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .segmented button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .actions button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
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

  .intro {
    padding-bottom: 4px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .discover {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .discover .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
</style>
