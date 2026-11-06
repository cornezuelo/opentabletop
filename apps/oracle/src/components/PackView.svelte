<script lang="ts">
  import { KindBadge, manifestOf } from '@open-tabletop/pack-ui'
  import { appUrl } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { displayName, KIND_ORDER } from '../lib/names'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'

  /** What a pack brings to roll; everything else about it is in the Packs app. */
  let { root }: { root: string } = $props()

  const pack = $derived(workspace.pack(root))
  const manifest = $derived(pack ? manifestOf(pack) : {})
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
  const errors = $derived(workspace.diagnostics(root).filter((d) => d.severity === 'error').length)
</script>

{#if pack}
  <article>
    <h1 class="page-title">{manifest.name ?? root}</h1>
    <a class="open" href={`${appUrl('packs')}#/pack/${encodeURIComponent(root)}`}
      >{t('pack.open')}</a
    >
    {#if errors}<p class="bad">{t('nav.problems', { count: errors })}</p>{/if}
    <ul>
      {#each defs as def (def.id)}
        <li>
          <button onclick={() => go({ name: 'def', id: def.id, tab: 'roll' })}>
            <KindBadge kind={def.kind} locale={getLocale()} />
            <span>{displayName(def)}</span>
            <code>{def.localId}</code>
          </button>
        </li>
      {:else}
        <li class="none">{t('pack.nothing')}</li>
      {/each}
    </ul>
  </article>
{/if}

<style>
  article {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 900px;
  }

  .open {
    font-size: 13px;
    color: var(--accent);
  }

  .bad {
    margin: 0;
    color: var(--danger-text);
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  button {
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

  button:hover {
    background: var(--panel-hover);
  }

  code {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  .none {
    color: var(--text-muted);
  }
</style>
