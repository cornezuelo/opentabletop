<script lang="ts">
  import { BundledUpdates, manifestOf } from '@open-tabletop/pack-ui'
  import { DEFAULT_SYSTEM, systemName } from '@open-tabletop/session'
  import { appUrl } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go, type Tab } from '../lib/nav.svelte'
  import { rulesFile, systemFile, systemParts, systemRoot } from '../lib/newSystem'
  import { library, systems } from '../lib/packs.svelte'
  import { systemDoc } from '../lib/systemDoc.svelte'
  import { systemTabs } from '../lib/tabs'
  import { staleCopies } from '../lib/transfer'
  import ChecksForm from './forms/ChecksForm.svelte'
  import RulesForm from './forms/RulesForm.svelte'
  import Overview from './Overview.svelte'
  import PartsTab from './parts/PartsTab.svelte'
  import ReadOnly from './ReadOnly.svelte'
  import TryTab from './TryTab.svelte'
  import YamlTab from './YamlTab.svelte'

  /** One system: its overview, its rules and checks, its files; play it in Travel. */
  let { id, tab, item }: { id: string; tab: Tab; item?: string } = $props()

  const system = $derived(systems.get(id))
  /** Where its travel rules (and bindings) are, and where its own definition is. */
  const file = $derived(system ? rulesFile(system) : null)
  const declared = $derived(system ? systemFile(system) : null)
  const root = $derived(system ? (systemRoot(system) ?? file?.root) : undefined)
  const tabs = $derived(
    systemTabs({ rules: !!file, pack: !!system?.pack, files: !!(file || declared) }),
  )
  const doc = systemDoc(() => file ?? { root: '', path: '' })
  const overview = systemDoc(() => declared ?? { root: '', path: '' })
  /** The files its parts are written in, for the YAML tab (its rules' first). */
  const files = $derived.by(() => {
    const out: { root: string; path: string }[] = []
    const add = (root: string | undefined, path: string | undefined) => {
      if (root && path && !out.some((f) => f.root === root && f.path === path))
        out.push({ root, path })
    }
    add(file?.root, file?.path)
    add(file?.root, file?.bindings?.path)
    add(declared?.root, declared?.system?.path)
    if (system)
      for (const kind of [
        'sheet',
        'items',
        'bestiary',
        'places',
        'factions',
        'clocks',
        'world',
        'calendar',
        'weather',
        'land',
        'roll-modes',
      ] as const)
        for (const part of systemParts(system, kind)) add(part.root, part.path)
    return out
  })
  const problems = $derived(
    files.flatMap((f) => library.diagnostics(f.root, f.path).filter((d) => d.severity === 'error')),
  )
  /** Packs it uses (Core…) that are your copies, older than the bundled ones. */
  const stale = $derived(system ? staleCopies(system) : [])
</script>

{#if system}
  <article class="system">
    <header>
      <h1 class="page-title">{systemName(system, getLocale())}</h1>
      <a class="play" href={`${appUrl('travel')}#/system/${encodeURIComponent(id)}/play`}
        >{t('edit.playInTravel')}</a
      >
      <!-- On every tab: edit a copy of a bundled system, or revert your copy to it. -->
      <!-- Core's Generic rules: every system may bring Core, so no copy of it (a new system
           starts from a copy of its rules instead). -->
      {#if system.id === DEFAULT_SYSTEM && library.pack(root ?? '')?.origin === 'bundled'}
        <p class="help">{t('edit.builtIn')}</p>
      {:else if root}<div class="copy"><ReadOnly {root} /></div>{/if}
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
      {#each stale as copy (copy)}
        <div class="stale">
          <p>{t('edit.staleCopy', { pack: manifestOf(library.pack(copy)!).name ?? copy })}</p>
          <BundledUpdates {library} root={copy} locale={getLocale()} />
        </div>
      {/each}
      {#if problems.length && tab !== 'yaml'}
        <button class="problems" onclick={() => go({ name: 'system', id, tab: 'yaml' })}>
          {t('forms.problems', { count: problems.length })}
        </button>
      {/if}
      {#if tab === 'try'}
        <TryTab {system} />
      {:else if tab === 'yaml' && files.length}
        <YamlTab {files} own={library.rootOf(system.pack ?? '')} />
      {:else if (tab === 'sheet' || tab === 'items' || tab === 'bestiary' || tab === 'places' || tab === 'factions' || tab === 'clocks' || tab === 'world' || tab === 'calendar' || tab === 'weather' || tab === 'land' || tab === 'modes') && system.pack}
        <PartsTab {system} kind={tab === 'modes' ? 'roll-modes' : tab} {item} />
      {:else if (tab === 'rules' || tab === 'checks') && file}
        <div class="forms">
          {#if tab === 'rules'}<RulesForm {doc} {system} />{:else}<ChecksForm {doc} {system} />{/if}
        </div>
      {:else}
        <Overview {system} doc={declared ? overview : null} />
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

  /* Wraps instead of pushing the view wider than its column (the help column open). */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 12px;
    border-bottom: 1px solid var(--panel-border);
  }

  .tabs button {
    padding: 6px 14px;
    white-space: nowrap;
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

  .forms {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 24px;
  }

  .stale p {
    margin: 0 0 6px;
    font-size: 13px;
  }

  .problems {
    align-self: flex-start;
    margin-bottom: 14px;
    padding: 6px 10px;
    color: #e3a19f;
    text-align: left;
    background: none;
    border: 1px solid #e3a19f;
    border-radius: 6px;
    cursor: pointer;
  }

  .play {
    display: inline-block;
    margin-top: 6px;
    font-size: 13px;
    color: var(--accent);
  }

  .copy:not(:empty) {
    margin-top: 8px;
  }

  .help {
    margin: 6px 0 0;
    color: var(--text-muted);
  }
</style>
