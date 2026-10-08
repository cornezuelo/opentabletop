<script lang="ts">
  import { highlight, searchWords, type SearchResult } from './pages'

  let {
    results,
    query,
    showApp = false,
    appName = (app) => app,
    empty,
    onopen,
  }: {
    results: SearchResult[]
    /** What was searched: its words show in bold. */
    query: string
    showApp?: boolean
    appName?: (app: string) => string
    empty: string
    onopen: (result: SearchResult) => void
  } = $props()

  const words = $derived(searchWords(query))
</script>

{#snippet marked(text: string)}{#each highlight(text, words) as part, i (i)}{#if part.match}<strong
        >{part.text}</strong
      >{:else}{part.text}{/if}{/each}{/snippet}

<ul class="results">
  {#each results as r (`${r.page.app}/${r.page.slug}#${r.section.id}`)}
    <li>
      <button onclick={() => onopen(r)}>
        <span class="where"
          >{showApp ? `${appName(r.page.app)} · ` : ''}{@render marked(
            r.page.title + (r.section.title ? ` › ${r.section.title}` : ''),
          )}</span
        >
        <span class="snippet">{@render marked(r.snippet)}</span>
      </button>
    </li>
  {:else}
    <li class="empty">{empty}</li>
  {/each}
</ul>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 6px 8px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    background: rgb(200 162 74 / 0.08);
  }

  .where {
    color: var(--accent);
    font-size: 13px;
  }

  .snippet {
    font-size: 12px;
    color: var(--text-muted);
  }

  strong {
    font-weight: 700;
    color: var(--text);
  }

  .where strong {
    color: inherit;
  }

  .empty {
    padding: 6px 8px;
    color: var(--text-muted);
  }
</style>
