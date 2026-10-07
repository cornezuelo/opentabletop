<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { contextSuggestions } from '@open-tabletop/session'
  import { library } from '../lib/packs.svelte'
  import { t } from '../lib/i18n'
  import { edgeChoices, edgeName, terrainChoices, terrainName } from '../lib/terrains'
  import { trip } from '../lib/trip.svelte'

  /** The hexes of an abstract trip: terrain, tags and the road or river to the next one. */
  let { system }: { system: TravelSystem } = $props()

  const way = $derived(trip.saved.way)
  const here = $derived(trip.location)
  const terrains = $derived(terrainChoices(system))
  const edges = $derived(edgeChoices(system))
  /** Tags the packs' tables and checks look for (landmark, toll, haunted…). */
  const knownTags = $derived(contextSuggestions(library.registry).tags ?? [])
</script>

<div class="way">
  <div class="head">
    <span class="title">{t('play.way')}<InfoTip text={t('play.wayHelp')} /></span>
    <label class="km">
      <input
        type="number"
        min="0.1"
        step="any"
        value={trip.saved.hexKm}
        onchange={(e) => trip.setHexKm(Number(e.currentTarget.value) || 10)}
      />
      {t('play.hexKm')}
    </label>
  </div>
  <ol>
    {#each way as hex, i (i)}
      <li class:passed={i < here} class:here={i === here}>
        <span class="n"
          >{i + 1}{#if i === here}<small>{t('play.here')}</small>{/if}</span
        >
        <select
          aria-label={t('play.terrain')}
          value={hex.terrain}
          disabled={i < here}
          onchange={(e) => {
            const terrain = e.currentTarget.value
            trip.updateHex(i, (h) => ({ ...h, terrain }))
          }}
        >
          {#each terrains as id (id)}<option value={id}>{terrainName(id)}</option>{/each}
        </select>
        <SuggestInput
          label={t('play.tags')}
          placeholder={t('play.tagsPlaceholder')}
          value={hex.tags.join(', ')}
          list={knownTags}
          disabled={i < here}
          onchange={(text) => {
            const tags = text
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            trip.updateHex(i, (h) => ({ ...h, tags }))
          }}
        />
        <button
          class="icon"
          aria-label={t('play.remove')}
          use:tooltip={t('play.remove')}
          disabled={i <= here || way.length <= 1}
          onclick={() => trip.removeHex(i)}>×</button
        >
        {#if i < way.length - 1}
          <div class="edges" aria-label={t('play.edges')}>
            <span>↓</span>
            {#each edges as kind (kind)}
              <label>
                <input
                  type="checkbox"
                  checked={hex.edges.includes(kind)}
                  disabled={i < here}
                  onchange={(e) => {
                    const on = e.currentTarget.checked
                    trip.updateHex(i, (h) => ({
                      ...h,
                      edges: on ? [...h.edges, kind] : h.edges.filter((k) => k !== kind),
                    }))
                  }}
                />
                {edgeName(kind)}
              </label>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
  <button class="add" onclick={() => trip.addHex()}>{t('play.addHex')}</button>
</div>

<style>
  .way {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title {
    font-weight: 600;
  }

  .km {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .km input {
    width: 70px;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) 28px;
    gap: 6px;
    align-items: center;
    padding: 4px 6px;
    border-radius: 6px;
  }

  li.here {
    background: rgb(200 162 74 / 0.12);
    outline: 1px solid var(--accent);
  }

  li.passed {
    opacity: 0.55;
  }

  .n {
    display: flex;
    flex-direction: column;
    font-family: ui-monospace, monospace;
    color: var(--text-muted);
  }

  .n small {
    font-family: system-ui, sans-serif;
    font-size: 10px;
    color: var(--accent);
  }

  .edges {
    display: flex;
    flex-wrap: wrap;
    grid-column: 2 / -1;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .edges label {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .icon {
    height: 28px;
  }

  .add {
    align-self: flex-start;
    padding: 5px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
