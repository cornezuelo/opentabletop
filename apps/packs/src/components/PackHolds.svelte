<script lang="ts">
  import { InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { kindName } from '../lib/kindNames'
  import { go, showSide } from '../lib/nav.svelte'
  import { library, oracleUi, systems } from '../lib/packs.svelte'
  import { packTree } from '../lib/tree'
  import { systemName } from '@open-tabletop/session'

  /** What a pack holds, a card per kind; its first definition a click away. */
  let { root }: { root: string } = $props()

  const tree = $derived(
    packTree(library, root, {
      locale: getLocale(),
      systems: systems.list,
      displayName: oracleUi.displayName,
    }),
  )
  const kinds = $derived(tree.groups.filter((g) => g.kind !== 'files'))
</script>

<section>
  <h2>{t('library.holds')}<InfoTip text={t('library.holdsHelp')} /></h2>
  {#if tree.systems.length || kinds.length}
    <div class="cards">
      {#each tree.systems as s (s.id)}
        <button
          class="card"
          onclick={() => {
            showSide('systems')
            go({ name: 'system', id: s.id, tab: 'overview' })
          }}
        >
          <small>{t('library.system')}</small>
          <strong>{systemName(s, getLocale())}</strong>
        </button>
      {/each}
      {#each kinds as g (g.kind)}
        <button class="card" onclick={() => go(g.items[0].view)}>
          <small>{kindName(g.kind)}</small>
          <strong>{g.items.length}</strong>
        </button>
      {/each}
    </div>
  {:else}
    <Markdown text={t('library.noHolds')} />
  {/if}
</section>

<style>
  h2 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    color: var(--text);
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .card:hover {
    border-color: var(--accent);
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  strong {
    overflow: hidden;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
