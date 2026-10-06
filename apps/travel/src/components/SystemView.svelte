<script lang="ts">
  import { t } from '../lib/i18n'
  import { go, type Tab } from '../lib/nav.svelte'
  import { rulesFile } from '../lib/newSystem'
  import { systems } from '../lib/packs.svelte'
  import PlayTab from './PlayTab.svelte'
  import YamlTab from './YamlTab.svelte'

  /** One travel system: play a trip with it, or see and edit its rules. */
  let { id, tab }: { id: string; tab: Tab } = $props()

  const system = $derived(systems.get(id))
  const file = $derived(id === 'generic' ? null : rulesFile(id))
  const tabs = $derived<Tab[]>(file ? ['play', 'yaml'] : ['play'])
</script>

{#if system}
  <article class="system">
    <header>
      <h1>{system.id === 'generic' ? t('nav.generic') : system.name}</h1>
      {#if !file}<p class="help">{t('edit.builtIn')}</p>{/if}
      <div class="tabs" role="tablist">
        {#each tabs as name (name)}
          <button
            role="tab"
            aria-selected={tab === name}
            class:active={tab === name}
            onclick={() => go({ name: 'system', id, tab: name })}>{t(`tabs.${name}`)}</button
          >
        {/each}
      </div>
    </header>
    <div class="body">
      {#if tab === 'yaml' && file}
        <YamlTab root={file.root} path={file.path} />
      {:else}
        <PlayTab {system} />
      {/if}
    </div>
  </article>
{:else}
  <p class="help">{id}?</p>
{/if}

<style>
  .system {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
  }

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: normal;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-top: 12px;
    border-bottom: 1px solid var(--panel-border);
  }

  .tabs button {
    padding: 6px 14px;
    color: var(--text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }

  .tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .body {
    flex: 1;
    min-height: 0;
  }

  .help {
    margin: 6px 0 0;
    color: var(--text-muted);
  }
</style>
