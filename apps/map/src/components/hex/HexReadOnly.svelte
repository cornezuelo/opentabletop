<script lang="ts">
  import { noteUrl } from '@open-tabletop/ui-kit'
  import type { HexData, MapRegion } from '@open-tabletop/map'
  import { t } from '../../lib/i18n/index.svelte'
  import { renderMarkdown } from '../../lib/markdown'

  /** A cell as Play shows it: what it holds, to read; nothing to fill in. */
  let {
    hex,
    regions,
    inherited,
  }: {
    hex: HexData
    /** The regions it's in, from the innermost out. */
    regions: MapRegion[]
    /** What it gets from them, in words. */
    inherited: { region: string; values: string } | null
  } = $props()

  const region = $derived(
    regions
      .map((r) => r.name)
      .filter(Boolean)
      .reverse()
      .join(' › '),
  )
  const notesHtml = $derived(renderMarkdown(hex.notes ?? ''))
  const empty = $derived(
    !hex.name &&
      !region &&
      !hex.notes &&
      !hex.note &&
      !hex.pois?.length &&
      !hex.tags?.length &&
      !hex.fields?.length &&
      !inherited,
  )
</script>

{#snippet noteLink(note: string | undefined)}
  {#if note}
    {@const url = noteUrl(note)}
    {#if url}
      <a href={url} target="_blank" rel="noreferrer">{note} ↗</a>
    {:else}
      <span class="muted">{note}</span>
    {/if}
  {/if}
{/snippet}

{#if hex.name}<h2>{hex.name}</h2>{/if}
{#if region}<p class="muted">{region}</p>{/if}
{#if hex.notes}
  <!-- Sanitized by renderMarkdown. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="markdown">{@html notesHtml}</div>
{/if}
{@render noteLink(hex.note)}
{#if hex.pois?.length}
  <h3>{t('hex.pois')}</h3>
  <ul>
    {#each hex.pois as poi (poi.id)}
      <li>
        <strong>{poi.name}</strong>
        {#if poi.description}<p>{poi.description}</p>{/if}
        {#each poi.fields ?? [] as field (field.key)}
          <p class="muted">{field.key}: {field.value}</p>
        {/each}
        {@render noteLink(poi.note)}
      </li>
    {/each}
  </ul>
{/if}
{#if hex.tags?.length}
  <p class="tags">
    {#each hex.tags as tag (tag)}<span>{tag}</span>{/each}
  </p>
{/if}
{#if hex.fields?.length}
  <dl>
    {#each hex.fields as field (field.key)}
      <dt>{field.key}</dt>
      <dd>{field.value}</dd>
    {/each}
  </dl>
{/if}
{#if inherited}<p class="muted">{t('fields.fromRegion', inherited)}</p>{/if}
{#if empty}<p class="muted">{t('hex.nothingHere')}</p>{/if}
<p class="muted hint">{t('hex.readOnly')}</p>

<style>
  h2 {
    margin: 0;
    font-size: 16px;
  }

  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
  }

  p {
    margin: 0;
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }

  .hint {
    margin-top: 4px;
    font-style: italic;
  }

  a {
    font-size: 12px;
    color: var(--accent);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tags span {
    padding: 1px 8px;
    font-size: 12px;
    border: 1px solid var(--panel-border);
    border-radius: 10px;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    margin: 0;
    font-size: 13px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }
</style>
