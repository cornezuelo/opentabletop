<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { InfoTip, TagInput, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { connectionChoices, connectionName, terrainChoices, terrainName } from './terrains'
  import type { TripStore } from './trips.svelte'

  /** The hexes of a trip without a map: terrain, tags and the road or river to the next one. */
  let {
    trip,
    system,
    locale,
    tags,
  }: {
    trip: TripStore
    system: TravelSystem
    locale: string
    /** Tags the packs' tables and checks look for (landmark, toll, haunted…), suggested. */
    tags: string[]
  } = $props()

  const t = translator(() => locale)
  const way = $derived(trip.saved.way)
  const here = $derived(trip.location)
  const terrains = $derived(terrainChoices(system))
  const kinds = $derived(connectionChoices(system))
</script>

<div class="way">
  <div class="head">
    <span class="title">{t('play.way')}<InfoTip text={t('play.wayHelp')} /></span>
    <label class="km">
      <input
        type="number"
        min="0.1"
        step="any"
        value={trip.cellKm}
        disabled={system.rules.travel.cellKm !== undefined}
        onchange={(e) => trip.setHexKm(Number(e.currentTarget.value) || 10)}
      />
      {t('play.cellKm')}<InfoTip
        text={system.rules.travel.cellKm !== undefined
          ? t('play.cellKmSystem')
          : t('play.cellKmHelp')}
      />
    </label>
  </div>
  <div class="columns" aria-hidden="true">
    <span>#<InfoTip text={t('play.numberHelp')} /></span>
    <span>{t('play.terrain')}<InfoTip text={t('play.terrainHelp')} /></span>
    <span>{t('play.tags')}<InfoTip text={t('play.tagsHelp')} /></span>
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
          {#each terrains as id (id)}<option value={id}>{terrainName(t, id)}</option>{/each}
        </select>
        <TagInput
          label={t('play.tags')}
          placeholder={t('play.tagsPlaceholder')}
          value={hex.tags}
          choices={tags}
          removeLabel={t('play.remove')}
          disabled={i < here}
          onchange={(tags) => trip.updateHex(i, (h) => ({ ...h, tags }))}
        />
        <button
          class="icon"
          aria-label={t('play.remove')}
          use:tooltip={t('play.remove')}
          disabled={i <= here || way.length <= 1}
          onclick={() => trip.removeHex(i)}>×</button
        >
        {#if i < way.length - 1}
          <div class="connections" aria-label={t('play.connections')}>
            <span
              >↓ {t('play.connections')}{#if i === 0}<InfoTip
                  text={t('play.connectionsHelp')}
                />{/if}</span
            >
            {#each kinds as kind (kind)}
              <label>
                <input
                  type="checkbox"
                  checked={hex.connections.includes(kind)}
                  disabled={i < here}
                  onchange={(e) => {
                    const on = e.currentTarget.checked
                    trip.updateHex(i, (h) => ({
                      ...h,
                      connections: on
                        ? [...h.connections, kind]
                        : h.connections.filter((k) => k !== kind),
                    }))
                  }}
                />
                {connectionName(t, kind)}
              </label>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
  <button class="button add" onclick={() => trip.addHex()}>{t('play.addHex')}</button>
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

  /* The same columns as each hex's row. */
  .columns {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) 28px;
    gap: 6px;
    padding: 0 6px;
    font-size: 12px;
    color: var(--text-muted);
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

  .connections {
    display: flex;
    flex-wrap: wrap;
    grid-column: 2 / -1;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .connections label {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .icon {
    height: 28px;
  }

  .add {
    align-self: flex-start;
  }
</style>
