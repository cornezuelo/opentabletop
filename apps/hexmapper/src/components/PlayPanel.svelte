<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { TripPanel, TripSetup } from '@open-tabletop/travel-ui'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../lib/icons/registry'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
  import {
    clearTrail,
    editSession,
    resetParty,
    restartRules,
    sessionOf,
    setMode,
    step,
    updatePlay,
    type Season,
  } from '../lib/play/play'
  import { oracleUi } from '../lib/play/oracle'
  import { getSystem, playSystems } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'
  import { showToast, tooltip } from '@open-tabletop/ui-kit'
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
  <TripSetup
    systems={playSystems()}
    system={play.rules?.system ?? 'generic'}
    locale={getLocale()}
    bind:season={newSeason}
    onrestart={restartRules}
  />
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
  .secondary {
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
</style>
