<script lang="ts">
  import { t } from '../lib/i18n'
  import { displayDescription, displayName } from '../lib/names'
  import { go } from '../lib/nav.svelte'
  import { favorites, RollPanel } from '@open-tabletop/oracle-ui'
  import { oracleUi } from '../lib/oracle'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { locate } from '@open-tabletop/pack-ui/yaml'
  import KindBadge from './KindBadge.svelte'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'
  import DefinitionEditor from './edit/DefinitionEditor.svelte'
  import { tooltip, showToast } from '@open-tabletop/ui-kit'
  import { copyDefinition, deleteDefinition } from '../lib/packs/definitions'
  import { manifestOf } from '../lib/packs/workspace'

  let { id, tab }: { id: string; tab: 'roll' | 'edit' } = $props()

  const def = $derived(workspace.registry.definitions.get(id))
  const root = $derived(def ? def.file.split('/')[0] : '')
  const file = $derived(def ? def.file.slice(root.length + 1) : '')
  const editable = $derived(workspace.isEditable(root))
  const line = $derived(def ? locate(workspace.readFile(root, file) ?? '', def.localId) : undefined)
  /** User packs a copy can go to (besides this one). */
  const targets = $derived(workspace.packs.filter((p) => p.origin === 'user' && p.root !== root))

  function copyTo(target: string) {
    if (!def || !target) return
    const copied = copyDefinition(def, target)
    if (!copied) return
    showToast(t('defActions.copied', { id: copied }))
    go({ name: 'def', id: copied, tab: 'edit' })
  }

  function remove() {
    if (!def || !confirm(t('edit.confirmDelete', { name: displayName(def) }))) return
    deleteDefinition(def)
    go({ name: 'pack', root })
  }
</script>

{#if def}
  <article class="definition">
    <header>
      <div class="title">
        <KindBadge kind={def.kind} full />
        <h1>{displayName(def)}</h1>
        <button
          class="star"
          class:on={favorites.has(def.id)}
          aria-pressed={favorites.has(def.id)}
          aria-label={t('nav.favorite')}
          use:tooltip={t('nav.favorite')}
          onclick={() => favorites.toggle(def.id)}>{favorites.has(def.id) ? '★' : '☆'}</button
        >
      </div>
      <div class="meta">
        <code>{def.id}</code>
        <button class="link" onclick={() => go({ name: 'file', root, path: file, line })}
          >{file}</button
        >
        <div class="actions">
          {#if editable}
            <button use:tooltip={t('defActions.duplicateHelp')} onclick={() => copyTo(root)}
              >{t('defActions.duplicate')}</button
            >
          {/if}
          {#if targets.length}
            <select
              aria-label={t('defActions.copyTo')}
              use:tooltip={t('defActions.copyToHelp')}
              value=""
              onchange={(e) => {
                copyTo(e.currentTarget.value)
                e.currentTarget.value = ''
              }}
            >
              <option value="" disabled>{t('defActions.copyTo')}</option>
              {#each targets as p (p.root)}
                <option value={p.root}>{manifestOf(p).name ?? p.root}</option>
              {/each}
            </select>
          {/if}
          {#if editable}
            <button class="danger" onclick={remove}>{t('edit.deleteDefinition')}</button>
          {/if}
        </div>
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
      {:else}
        {#key def.id}<DefinitionEditor {def} {root} />{/key}
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

  .star {
    padding: 0 4px;
    font-size: 20px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .star.on,
  .star:hover {
    color: var(--accent);
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .actions button,
  .actions select {
    padding: 3px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions .danger:hover {
    color: #e3a19f;
    border-color: #e3a19f;
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

  .help {
    color: var(--text-muted);
  }
</style>
