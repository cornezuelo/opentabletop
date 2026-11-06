<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { KindBadge, manifestOf, PackPage } from '@open-tabletop/pack-ui'
  import { dialogs } from '../lib/dialogs.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { displayName, KIND_ORDER } from '../lib/names'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'

  let { root }: { root: string } = $props()

  const pack = $derived(workspace.pack(root))
  const manifest = $derived(pack ? manifestOf(pack) : {})
  const editable = $derived(workspace.isEditable(root))
  const defs = $derived(
    manifest.id
      ? workspace.engine
          .list({ pack: manifest.id })
          .sort(
            (a, b) =>
              KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
              displayName(a).localeCompare(displayName(b)),
          )
      : [],
  )
  const extras = $derived(manifest.id ? (workspace.registry.extras.get(manifest.id) ?? []) : [])
</script>

<PackPage
  library={workspace}
  locale={getLocale()}
  {root}
  onfile={(path, line) => go({ name: 'file', root, path, line })}
  onpack={(made) => go({ name: 'pack', root: made })}
  ongone={() => go({ name: 'welcome' })}
>
  {#snippet holds()}
    <section>
      <h2>{t('pack.definitions')}</h2>
      <ul class="defs">
        {#each defs as def (def.id)}
          <li>
            <button class="row" onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}>
              <KindBadge kind={def.kind} locale={getLocale()} />
              <span>{displayName(def)}</span>
              <code>{def.localId}</code>
            </button>
          </li>
        {/each}
      </ul>
      {#if editable}
        <button class="plain" onclick={() => (dialogs.newDefinition = { root })}
          >{t('pack.newDefinition')}</button
        >
      {/if}
      {#if extras.length}
        <h3>{t('pack.other')}<InfoTip text={t('pack.otherHelp')} /></h3>
        <ul class="defs">
          {#each extras as extra, i (i)}
            <li>
              <button
                class="row"
                onclick={() => go({ name: 'file', root, path: extra.file.slice(root.length + 1) })}
              >
                <span class="kind">{extra.kind}</span>
                <code>{extra.id ?? ''}</code>
                <span class="muted">{extra.file.slice(root.length + 1)}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/snippet}
</PackPage>

<style>
  h2 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  h3 {
    margin: 12px 0 6px;
    font-size: 13px;
    font-weight: normal;
    color: var(--text-muted);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .defs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2px 16px;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 4px 6px;
    font-size: 14px;
    color: var(--text);
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .row:hover {
    background: var(--panel-hover);
  }

  .row code,
  .muted {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  .kind {
    font-size: 12px;
    color: var(--text-muted);
  }

  .plain {
    margin-top: 8px;
    padding: 6px 12px;
  }
</style>
