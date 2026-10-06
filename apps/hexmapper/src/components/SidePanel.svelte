<script lang="ts">
  import ExportPanel from './ExportPanel.svelte'
  import HexInfo from './hex/HexInfo.svelte'
  import IconPanel from './IconPanel.svelte'
  import LabelPanel from './LabelPanel.svelte'
  import TokenPanel from './tokens/TokenPanel.svelte'
  import LanguageSelect from './LanguageSelect.svelte'
  import LayersPanel from './LayersPanel.svelte'
  import LibraryPanel from './LibraryPanel.svelte'
  import MapSettings from './MapSettings.svelte'
  import MapSize from './MapSize.svelte'
  import PathPanel from './PathPanel.svelte'
  import PlayPanel from './PlayPanel.svelte'
  import Preferences from './Preferences.svelte'
  import Section from './Section.svelte'
  import TerrainPanel from './TerrainPanel.svelte'
  import CaptionSettings from './CaptionSettings.svelte'
  import RegionPanel from './RegionPanel.svelte'
  import { OraclePanel } from '@open-tabletop/oracle-ui'
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { AppBrand, AppSwitcher, InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import { addResultAsPoi, oracleUi, rollContext, rollHex } from '../lib/play/oracle'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import type { HexKey } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'

  const hexCoord = (hex: HexKey) => formatCoord(parseKey(hex), editor.grid.coordFormat, editor.grid)
</script>

<aside class="panel">
  {#if editor.panelView === 'settings'}
    <header>
      <h1>{t('panel.settings')}</h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    <Section title={t('panel.map')}><MapSettings /></Section>
    <Section title={t('map.size')}><MapSize /></Section>
    <Section title={t('captions.title')}><CaptionSettings /></Section>
    <Section title={t('panel.preferences')}>
      <label class="field">
        <span>{t('settings.language')}</span>
        <LanguageSelect />
      </label>
      <Preferences />
    </Section>
  {:else if editor.panelView === 'library'}
    <header>
      <h1>{t('library.title')}</h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    <div class="export"><LibraryPanel /></div>
  {:else if editor.panelView === 'oracle'}
    <header>
      <h1>{t('oracle.title')}<InfoTip text={t('oracle.help')} /></h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    {@const hex = rollHex()}
    {@const coord = hex ? hexCoord(hex) : ''}
    <div class="export">
      <OraclePanel ui={oracleUi} context={rollContext()}>
        {#snippet header()}
          <p class="rolls-for" class:none={!hex}>
            {hex
              ? editor.selected
                ? t('oracle.rollsFor', { hex: coord })
                : t('oracle.rollsForParty', { hex: coord })
              : t('oracle.noHex')}
          </p>
        {/snippet}
        {#snippet actions(item)}
          {#if hex && item.resolution.text}
            <button
              class="result-action"
              onclick={() => {
                const text = item.resolution.text
                if (!hex || !text) return
                const def = oracleUi.library.registry.definitions.get(item.source)
                addResultAsPoi(hex, text, oracleUi.displayName(def, item.source))
                showToast(t('oracle.poiAdded', { hex: coord }))
              }}>{t('oracle.addPoi', { hex: coord })}</button
            >
          {/if}
        {/snippet}
      </OraclePanel>
    </div>
  {:else if editor.panelView === 'layers'}
    <header>
      <h1>{t('panel.layers')}</h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    <div class="export"><LayersPanel /></div>
  {:else if editor.panelView === 'help'}
    <header>
      <h1>{t('panel.help')}</h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    <div class="export"><HelpPanel app="hexmapper" locale={getLocale()} /></div>
  {:else if editor.panelView === 'export'}
    <header>
      <h1>{t('export.title')}</h1>
      <button
        class="close"
        title={t('panel.closeSettings')}
        aria-label={t('panel.closeSettings')}
        onclick={() => (editor.panelView = 'tool')}>✕</button
      >
    </header>
    <div class="export"><ExportPanel /></div>
  {:else}
    <header>
      <AppBrand app="hexmapper" name={editor.meta.name || t('app.title')} />
      <AppSwitcher current="hexmapper" locale={getLocale()} />
    </header>
    {@render toolView()}
  {/if}
</aside>

{#snippet toolView()}
  {#if editor.tool === 'terrain'}
    <Section title={t('panel.terrain')}><TerrainPanel /></Section>
  {:else if editor.tool === 'region'}
    <Section title={t('panel.regions')}><RegionPanel /></Section>
  {:else if editor.tool === 'path'}
    <Section title={t('panel.paths')}><PathPanel /></Section>
  {:else if editor.tool === 'icon'}
    <Section title={t('panel.icons')}><IconPanel /></Section>
  {:else if editor.tool === 'text'}
    <Section title={t('panel.text')}><LabelPanel /></Section>
  {:else if editor.tool === 'token'}
    <Section title={t('panel.tokens')}><TokenPanel /></Section>
  {:else if editor.tool === 'play'}
    <Section title={t('panel.play')}><PlayPanel /></Section>
  {:else}
    <Section title={t('panel.hex')}><HexInfo /></Section>
  {/if}
{/snippet}

<style>
  .panel {
    padding: 12px 16px;
    overflow-y: auto;
    background: var(--panel);
    border-left: 1px solid var(--panel-border);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--panel-border);
  }

  .export {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
  }

  .close {
    padding: 2px 8px;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .close:hover {
    color: var(--text);
    border-color: var(--panel-border);
  }

  h1 {
    margin: 0;
    font-size: 16px;
    color: var(--accent);
  }

  .rolls-for {
    margin: 0;
    font-size: 12px;
    color: var(--accent);
  }

  .rolls-for.none {
    color: var(--text-muted);
  }

  .result-action {
    padding: 4px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .result-action:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
