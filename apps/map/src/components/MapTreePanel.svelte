<script lang="ts">
  import { Markdown } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { library, openLibraryMap } from '../lib/io/actions.svelte'
  import { mapsTree, openMapAt, type TreeNode, type WayEnd } from '../lib/io/submaps'
  import { connectionName } from '../lib/play/systems'
  import { editor } from '../lib/store/editor.svelte'
  import WayArrow from './hex/WayArrow.svelte'

  /**
   * The whole tree of maps the open one is in: each map under the one it hangs from, each way
   * an arrow between its two cells. A map's name opens it; a cell opens its map there.
   */
  let nodes = $state<TreeNode[]>([])
  $effect(() => {
    void library.version
    void editor.linked
    void mapsTree().then((tree) => (nodes = tree))
  })
</script>

{#snippet end(way: WayEnd)}
  <button class="cell" onclick={() => openMapAt(way.map, way.cell)}>{way.label}</button>
{/snippet}

<ul>
  {#each nodes as node (node.id)}
    <li style:padding-left="{node.depth * 14}px">
      <div class="map">
        {#if node.id === editor.meta.id}
          <strong>{node.name || t('map.untitled')}</strong>
          <small>{t('submap.treeHere')}</small>
        {:else}
          <button class="name" onclick={() => openLibraryMap(node.id)}
            >{node.name || t('map.untitled')}</button
          >
        {/if}
      </div>
      {#each node.ways as way, i (i)}
        <div class="way">
          <WayArrow dir="in" />
          <span class="ends">
            {#if way.above}{@render end(way.above)}{:else}<small>{t('submap.treeAbove')}</small
              >{/if}
            <span aria-hidden="true">→</span>
            {@render end(way.below)}
            {#if way.kind}<small>{connectionName(way.kind)}</small>{/if}
          </span>
        </div>
      {/each}
    </li>
  {/each}
</ul>
{#if nodes.length === 1 && !nodes[0].ways.length}
  <div class="empty"><Markdown text={t('submap.treeEmpty')} /></div>
{/if}

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .map {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
  }

  /* What doesn't fit on a line goes on under the cells, not under the arrow. */
  .way {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px;
    margin-top: 3px;
    font-size: 12px;
  }

  .name,
  strong {
    font-weight: 600;
    color: var(--text);
  }

  small,
  .empty {
    font-size: 12px;
    color: var(--text-muted);
  }

  button {
    padding: 0;
    font: inherit;
    text-align: left;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  button:hover {
    text-decoration: underline;
  }
</style>
