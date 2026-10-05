<script lang="ts">
  import { getLocale, locales, setLocale, t, type Locale } from '../lib/i18n/index.svelte'
</script>

<select
  aria-label={t('settings.language')}
  title={t('settings.language')}
  value={getLocale()}
  onchange={(e) => setLocale(e.currentTarget.value as Locale)}
>
  {#each Object.entries(locales) as [code, name] (code)}
    <option value={code}>{name}</option>
  {/each}
</select>

<style>
  select {
    width: 100%;
    padding: 5px 8px;
    font: inherit;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }
</style>
