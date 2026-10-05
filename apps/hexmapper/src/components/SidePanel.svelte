<script lang="ts">
  import HexInfo from './hex/HexInfo.svelte'
  import LanguageSelect from './LanguageSelect.svelte'
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
  <header>
    <h1>{t('app.title')}</h1>
    <LanguageSelect />
  </header>

  {#if editor.tool === 'terrain'}
    <Section title={t('panel.terrain')}><TerrainPanel /></Section>
  {:else if editor.tool === 'path'}
    <Section title={t('panel.paths')}><PathPanel /></Section>
  {/if}
  <Section title={t('panel.hex')}><HexInfo /></Section>
  <Section title={t('panel.map')}><MapSettings /></Section>
  <Section title={t('map.size')}><MapSize /></Section>
  <Section title={t('panel.preferences')} open={false}><Preferences /></Section>
  <Section title={t('panel.shortcuts')} open={false}>
    <ul class="hints">
      <li>{t('hints.pan')}</li>
      <li>{t('hints.zoom')}</li>
      <li>{t('hints.erase')}</li>
      <li>{t('hints.pick')}</li>
      <li>{t('hints.brush')}</li>
      <li>{t('hints.path')}</li>
    </ul>
  </Section>
</aside>

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
