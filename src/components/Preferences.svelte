<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { getProvider, providers, providerSettings } from '../lib/notes/providers'
  import { preferences, setNoteProvider, setNoteSetting } from '../lib/store/preferences.svelte'

  const provider = $derived(getProvider(preferences.noteProvider))
  const values = $derived(providerSettings(provider, preferences.noteSettings[provider.id]))
</script>

<label class="field">
  <span>{t('preferences.noteProvider')}</span>
  <select value={provider.id} onchange={(e) => setNoteProvider(e.currentTarget.value)}>
    {#each providers as p (p.id)}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>
</label>

{#each provider.settings as setting (provider.id + setting.key)}
  <label class="field">
    <span>{t(setting.label)}</span>
    <input
      type="text"
      value={values[setting.key]}
      placeholder={setting.placeholder}
      onchange={(e) => setNoteSetting(provider.id, setting.key, e.currentTarget.value.trim())}
    />
  </label>
{/each}

<p class="help">{t('preferences.noteHelp')}</p>

<style>
  select {
    width: 100%;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
