<script lang="ts">
  import LanguageSelect from './LanguageSelect.svelte'
  import { t } from '../lib/i18n/index.svelte'
</script>

<aside class="panel">
  <header>
    <h2>{t('app.title')}</h2>
    <LanguageSelect />
  </header>
  <p class="muted">{t('panel.noSelection')}</p>
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
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
    color: var(--accent);
  }

  .muted {
    color: var(--text-muted);
  }
</style>
