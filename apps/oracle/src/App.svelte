<script lang="ts">
  import { showToast, Toasts, tooltip } from '@open-tabletop/ui-kit'
  import DefinitionView from './components/DefinitionView.svelte'
  import FileEditor from './components/FileEditor.svelte'
  import History from './components/History.svelte'
  import NewPackDialog from './components/NewPackDialog.svelte'
  import PackView from './components/PackView.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { workspace } from './lib/packs/workspace.svelte'
  import { manifestOf } from './lib/packs/workspace'
  import { zipToPack } from './lib/packs/zip'

  let creating = $state(false)

  async function importZip() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const pack = zipToPack(new Uint8Array(await file.arrayBuffer()))
        if (!pack) return showToast(t('import.noManifest'), 'error')
        const existing = workspace.pack(pack.root)
        if (existing?.origin === 'user' && !confirm(t('import.replace', { pack: pack.root })))
          return
        workspace.addPack(pack)
        showToast(
          t('import.done', { pack: manifestOf(pack).name ?? pack.root, count: pack.files.length }),
        )
        go({ name: 'pack', root: pack.root })
      } catch (error) {
        showToast(t('import.failed', { message: (error as Error).message }), 'error')
      }
    }
    input.click()
  }

  const count = $derived(workspace.registry.definitions.size)
</script>

<div class="app">
  <header class="bar">
    <button class="brand" onclick={() => go({ name: 'welcome' })}>
      <img src="/favicon.svg" alt="" />
      {t('app.title')}
    </button>
    <div class="spacer"></div>
    <button onclick={() => (creating = true)}>{t('nav.newPack')}</button>
    <button use:tooltip={t('nav.importTip')} onclick={importZip}>{t('nav.import')}</button>
    <select
      aria-label={t('nav.language')}
      value={getLocale()}
      onchange={(e) => setLocale(e.currentTarget.value as 'en' | 'es')}
    >
      {#each Object.entries(locales) as [code, name] (code)}
        <option value={code}>{name}</option>
      {/each}
    </select>
  </header>

  <Sidebar />

  <main>
    {#if nav.view.name === 'def'}
      <DefinitionView id={nav.view.id} tab={nav.view.tab} />
    {:else if nav.view.name === 'pack'}
      <PackView root={nav.view.root} />
    {:else if nav.view.name === 'file'}
      <FileEditor root={nav.view.root} path={nav.view.path} line={nav.view.line} />
    {:else}
      <div class="welcome">
        <h1>{t('welcome.title')}</h1>
        <p class="tagline">{t('app.tagline')}</p>
        <p>{t('welcome.body')}</p>
        <p class="muted">
          {t('welcome.packs', { packs: workspace.packs.length, definitions: count })}
        </p>
      </div>
    {/if}
  </main>

  <History />
</div>

{#if creating}
  <NewPackDialog onclose={() => (creating = false)} />
{/if}

<Toasts />

<style>
  .app {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr) 280px;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
  }

  .bar {
    display: flex;
    grid-column: 1 / -1;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-border);
  }

  .bar > button {
    padding: 5px 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .bar > button:hover {
    border-color: var(--accent);
  }

  .bar .brand {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0;
    font-family: Georgia, serif;
    font-size: 18px;
    background: none;
    border: none;
  }

  .brand img {
    width: 22px;
    height: 22px;
  }

  .spacer {
    flex: 1;
  }

  main {
    min-height: 0;
    padding: 18px 24px;
    overflow: auto;
  }

  .welcome {
    max-width: 640px;
    line-height: 1.6;
  }

  .welcome h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 32px;
    font-weight: normal;
  }

  .tagline {
    margin-top: 0;
    color: var(--accent);
  }

  .muted {
    color: var(--text-muted);
  }

  @media (max-width: 1100px) {
    .app {
      grid-template-columns: 240px minmax(0, 1fr);
    }

    .app > :global(.history) {
      display: none;
    }
  }
</style>
