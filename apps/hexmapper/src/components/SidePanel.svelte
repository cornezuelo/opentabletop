<script lang="ts">
  import HexInfo from './hex/HexInfo.svelte'
  import IconPanel from './IconPanel.svelte'
  import LanguageSelect from './LanguageSelect.svelte'
  import LayersPanel from './LayersPanel.svelte'
  import MapSettings from './MapSettings.svelte'
  import MapSize from './MapSize.svelte'
  import PathPanel from './PathPanel.svelte'
  import Preferences from './Preferences.svelte'
  import Section from './Section.svelte'
  import TerrainPanel from './TerrainPanel.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { editor } from '../lib/store/editor.svelte'
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
    <Section title={t('panel.preferences')}>
      <label class="field">
        <span>{t('settings.language')}</span>
        <LanguageSelect />
      </label>
      <Preferences />
    </Section>
  {:else}
    <header>
      <h1>{editor.meta.name || t('app.title')}</h1>
    </header>
    {@render toolView()}
  {/if}
</aside>

{#snippet toolView()}
  {#if editor.tool === 'terrain'}
    <Section title={t('panel.terrain')}><TerrainPanel /></Section>
  {:else if editor.tool === 'path'}
    <Section title={t('panel.paths')}><PathPanel /></Section>
  {:else if editor.tool === 'icon'}
    <Section title={t('panel.icons')}><IconPanel /></Section>
  {/if}
  <Section title={t('panel.hex')}><HexInfo /></Section>
  <Section title={t('panel.layers')} open={false}><LayersPanel /></Section>
  <Section title={t('panel.shortcuts')} open={false}>
    <ul class="hints">
      <li>{t('hints.pan')}</li>
      <li>{t('hints.zoom')}</li>
      <li>{t('hints.erase')}</li>
      <li>{t('hints.pick')}</li>
      <li>{t('hints.brush')}</li>
      <li>{t('hints.path')}</li>
      <li>{t('hints.icon')}</li>
    </ul>
  </Section>
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

  .hints {
    margin: 0;
    padding-left: 18px;
    color: var(--text-muted);
    line-height: 1.6;
  }
</style>
