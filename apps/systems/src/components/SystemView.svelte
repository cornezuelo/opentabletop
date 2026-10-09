<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { appUrl } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go, type Tab } from '../lib/nav.svelte'
  import { rulesFile, systemFile, systemParts, systemRoot } from '../lib/newSystem'
  import { library, systems } from '../lib/packs.svelte'
  import { systemDoc } from '../lib/systemDoc.svelte'
  import ChecksForm from './forms/ChecksForm.svelte'
  import RulesForm from './forms/RulesForm.svelte'
  import Overview from './Overview.svelte'
  import PartsTab from './parts/PartsTab.svelte'
  import ReadOnly from './ReadOnly.svelte'
  import TryTab from './TryTab.svelte'
  import YamlTab from './YamlTab.svelte'

  /** One system: its overview, its rules and checks, its files; play it in Travel. */
  let { id, tab }: { id: string; tab: Tab } = $props()

  const system = $derived(systems.get(id))
  /** Where its travel rules (and bindings) are, and where its own definition is. */
  const file = $derived(system ? rulesFile(system) : null)
  const declared = $derived(system ? systemFile(system) : null)
  const root = $derived(system ? (systemRoot(system) ?? file?.root) : undefined)
  const tabs = $derived<Tab[]>([
    'overview',
    ...(file ? (['rules', 'checks'] as Tab[]) : []),
    ...(system?.pack ? (['sheet', 'calendar', 'weather', 'modes'] as Tab[]) : []),
    'try',
    ...(file || declared ? (['yaml'] as Tab[]) : []),
  ])
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
      for (const kind of ['sheet', 'calendar', 'weather', 'roll-modes'] as const)
        for (const part of systemParts(system, kind)) add(part.root, part.path)
    return out
  })
  const problems = $derived(
    files.flatMap((f) => library.diagnostics(f.root, f.path).filter((d) => d.severity === 'error')),
  )
</script>

{#if system}
  <article class="system">
    <header>
      <h1>{system.id === 'generic' ? t('nav.generic') : systemName(system, getLocale())}</h1>
      {#if system.id === 'generic'}<p class="help">{t('edit.builtIn')}</p>{/if}
      <a class="play" href={`${appUrl('travel')}#/system/${encodeURIComponent(id)}/play`}
        >{t('edit.playInTravel')}</a
      >
      <!-- On every tab: edit a copy of a bundled system, or revert your copy to it. -->
      {#if root}<div class="copy"><ReadOnly {root} /></div>{/if}
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
      {#if problems.length && tab !== 'yaml'}
        <button class="problems" onclick={() => go({ name: 'system', id, tab: 'yaml' })}>
          {t('forms.problems', { count: problems.length })}
        </button>
      {/if}
      {#if tab === 'try'}
        <TryTab {system} />
      {:else if tab === 'yaml' && files.length}
        <YamlTab {files} />
      {:else if (tab === 'sheet' || tab === 'calendar' || tab === 'weather' || tab === 'modes') && system.pack}
        <PartsTab {system} kind={tab === 'modes' ? 'roll-modes' : tab} />
      {:else if (tab === 'rules' || tab === 'checks') && file}
        <div class="forms">
          {#if tab === 'rules'}<RulesForm {doc} />{:else}<ChecksForm {doc} {system} />{/if}
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

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: normal;
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
