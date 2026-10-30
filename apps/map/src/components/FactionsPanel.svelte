<script lang="ts">
  import { FactionCards } from '@open-tabletop/campaign-ui'
  import { confirmAction, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import {
    bringFactions,
    factionsSystem,
    removeFactions,
    systemFactions,
  } from '../lib/play/factions'
  import { worldTurnNow } from '../lib/play/world.svelte'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * The factions on the map: brought from its system, each with its colour, the hexes it
   * holds and its sheet; a world turn by hand, and turns by themselves with the world clock.
   */
  const own = $derived(editor.factions)
  const offered = $derived.by(() => {
    void editor.meta
    return systemFactions()
  })
  const system = $derived.by(() => {
    void own
    return factionsSystem()
  })
</script>

<!-- Its brush on the line itself: pressing it doesn't unfold the sheet. -->
{#snippet brush(id: string)}
  {@const painting = editor.factionBrush === id}
  <button
    class="brush"
    class:active={painting}
    aria-pressed={painting}
    aria-label={painting ? t('factions.stopPainting') : t('factions.paint')}
    use:tooltip={painting ? t('factions.stopPainting') : t('factions.paint')}
    onclick={(e) => {
      e.preventDefault()
      editor.factionBrush = painting ? null : id
    }}>✎</button
  >
{/snippet}

{#snippet paintHint(id: string)}
  {#if editor.factionBrush === id}
    <p class="help paint">
      {t('factions.paintHint')}<InfoTip markdown={t('factions.paintHelp')} />
    </p>
  {/if}
{/snippet}

<!-- The World panel's Factions tab: a line per faction with its brush; its sheet unfolds. -->
<div class="field">
  {#if own && system}
    <p class="help">{t('factions.intro')}<InfoTip markdown={t('factions.help')} /></p>
    <span class="help what">{t('factions.land')}<InfoTip markdown={t('factions.landHelp')} /></span>
    <FactionCards
      {own}
      {system}
      locale={getLocale()}
      territories={own.territories}
      head={brush}
      top={paintHint}
      onchange={(next) => editor.setFactions(next)}
      onturn={() => worldTurnNow()}
    />
    <button
      class="link"
      onclick={async () => (await confirmAction(t('factions.confirmRemove'))) && removeFactions()}
      >{t('factions.remove')}</button
    >
  {:else if offered}
    <p class="help">{t('factions.none')}</p>
    <button onclick={bringFactions}>{t('factions.bring')}</button>
  {:else}
    <p class="help">{t('factions.noSystem')}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .paint {
    margin-bottom: 6px;
  }

  .brush {
    flex: none;
    padding: 2px 8px;
    font-size: 14px;
  }

  .brush.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .what {
    align-self: flex-start;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .link {
    align-self: flex-start;
    padding: 0;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
