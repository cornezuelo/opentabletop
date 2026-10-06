<script lang="ts">
  import { t } from '../lib/i18n'
  import { displayDescription, displayName } from '../lib/names'
  import { go } from '../lib/nav.svelte'
  import { RollPanel } from '@open-tabletop/oracle-ui'
  import { oracleUi } from '../lib/oracle'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { locate } from '../lib/packs/yaml'
  import FileEditor from './FileEditor.svelte'
  import KindBadge from './KindBadge.svelte'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'
  import TableEditor from './TableEditor.svelte'

  let { id, tab }: { id: string; tab: 'roll' | 'edit' } = $props()

  const def = $derived(workspace.registry.definitions.get(id))
  const root = $derived(def ? def.file.split('/')[0] : '')
  const file = $derived(def ? def.file.slice(root.length + 1) : '')
  const editable = $derived(workspace.isEditable(root))
  const line = $derived(def ? locate(workspace.readFile(root, file) ?? '', def.localId) : undefined)
</script>

{#if def}
  <article class="definition">
    <header>
      <div class="title">
        <KindBadge kind={def.kind} full />
        <h1>{displayName(def)}</h1>
      </div>
      <div class="meta">
        <code>{def.id}</code>
        <button class="link" onclick={() => go({ name: 'file', root, path: file, line })}
          >{file}</button
        >
      </div>
      {#if displayDescription(def)}
        <p class="description">{displayDescription(def)}</p>
      {/if}
      <div class="tabs" role="tablist">
        {#each ['roll', 'edit'] as const as name (name)}
          <button
            role="tab"
            aria-selected={tab === name}
            class:active={tab === name}
            onclick={() => go({ name: 'def', id, tab: name })}>{t(`tabs.${name}`)}</button
          >
        {/each}
      </div>
    </header>

    <div class="body">
      {#if tab === 'roll'}
        <RollPanel ui={oracleUi} {def} />
      {:else if !editable}
        <ReadOnlyNotice {root} />
      {:else if def.kind === 'table'}
        <TableEditor {def} {root} />
      {:else}
        <p class="help">{t('edit.onlyTables', { kind: t(`kinds.${def.kind}`).toLowerCase() })}</p>
        <div class="file"><FileEditor {root} path={file} {line} /></div>
      {/if}
    </div>
  </article>
{:else}
  <p class="help">{id}?</p>
{/if}

<style>
  .definition {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
  }

  .title {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: normal;
  }

  .meta {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .description {
    margin: 8px 0 0;
    color: var(--text-muted);
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
    overflow: auto;
  }

  .file {
    height: calc(100% - 40px);
  }

  .help {
    color: var(--text-muted);
  }
</style>
