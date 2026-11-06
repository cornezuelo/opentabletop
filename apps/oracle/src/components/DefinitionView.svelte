<script lang="ts">
  import { getLocale, t } from '../lib/i18n'
  import { displayDescription, displayName } from '../lib/names'
  import { appUrl, Markdown } from '@open-tabletop/ui-kit'
  import { go } from '../lib/nav.svelte'
  import { favorites, RollPanel } from '@open-tabletop/oracle-ui'
  import { oracleUi } from '../lib/oracle.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { KindBadge } from '@open-tabletop/pack-ui'
  import { RolledBy } from '@open-tabletop/oracle-ui'
  import { ReadOnlyNotice } from '@open-tabletop/pack-ui'
  import { DefinitionEditor } from '@open-tabletop/oracle-ui'
  import { tooltip, showToast, confirmAction } from '@open-tabletop/ui-kit'
  import { copyDefinition, deleteDefinition } from '@open-tabletop/pack-ui'
  import { manifestOf } from '@open-tabletop/pack-ui'

  let { id, tab }: { id: string; tab: 'roll' | 'edit' } = $props()

  const def = $derived(workspace.registry.definitions.get(id))
  const root = $derived(def ? def.file.split('/')[0] : '')
  const file = $derived(def ? def.file.slice(root.length + 1) : '')
  const editable = $derived(workspace.isEditable(root))
  /** User packs a copy can go to (besides this one). */
  const targets = $derived(workspace.packs.filter((p) => p.origin === 'user' && p.root !== root))

  function copyTo(target: string) {
    if (!def || !target) return
    const copied = copyDefinition(workspace, def, target)
    if (!copied) return
    showToast(t('defActions.copied', { id: copied }))
    go({ name: 'def', id: copied, tab: 'edit' })
  }

  async function remove() {
    if (
      !def ||
      !(await confirmAction(oracleUi.t('edit.confirmDelete', { name: displayName(def) })))
    )
      return
    deleteDefinition(workspace, def)
    go({ name: 'pack', root })
  }
</script>

{#if def}
  <article class="definition">
    <header>
      <div class="title">
        <KindBadge kind={def.kind} locale={getLocale()} full />
        <h1 class="page-title">{displayName(def)}</h1>
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
        <a href={`${appUrl('packs')}#/file/${encodeURIComponent(root)}/${file}`}>{file}</a>
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
            <button class="danger" onclick={remove}>{oracleUi.t('edit.deleteDefinition')}</button>
          {/if}
        </div>
      </div>
      {#if displayDescription(def)}
        <div class="description"><Markdown text={displayDescription(def) ?? ''} /></div>
      {/if}
      <RolledBy {def} ui={oracleUi} />
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
        <ReadOnlyNotice
          library={workspace}
          locale={getLocale()}
          {root}
          onmade={(made) => go({ name: 'pack', root: made })}
        />
      {:else}
        {#key def.id}<DefinitionEditor {def} {root} ui={oracleUi} />{/key}
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
    padding-right: var(--scroll-room);
    overflow: auto;
    scrollbar-gutter: stable;
  }

  .help {
    color: var(--text-muted);
  }
</style>
