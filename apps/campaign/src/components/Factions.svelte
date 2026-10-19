<script lang="ts">
  import { withNotes, type Campaign } from '@open-tabletop/campaign'
  import { FactionNotes } from '@open-tabletop/campaign-ui'
  import { CharacterCard, placeUrl } from '@open-tabletop/character-ui'
  import { factionName, localize, type LocalizedText } from '@open-tabletop/session'
  import { InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { open } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'
  import LandMap from './LandMap.svelte'

  /**
   * The campaign's factions: each one's card and sheet, their land on a map of the campaign
   * (a read-only minimap; painted in the Hexmapper), a world turn on that map, and turns by
   * themselves as the world clock moves on. `faction` is the one open (a deep link).
   */
  let { campaign, faction }: { campaign: Campaign; faction?: string } = $props()

  const own = $derived(campaign.factions)
  const offered = $derived(open.system.factions)
  /** The system the factions came from (their names and turn tables), if still loaded. */
  const system = $derived(own ? systems.get(own.system).factions : undefined)
  const map = $derived(open.landMap)
  const land = $derived(map?.territories ?? {})
  const name = (id: string) => (system ? factionName(system, id, getLocale()) : id)
  const about = (id: string) =>
    (system &&
      localize(system.def.factions[id]?.description as LocalizedText | undefined, getLocale())) ||
    ''
  const color = (id: string) => system?.def.factions[id]?.color ?? '#8a7f6e'
  const count = (id: string) => {
    const n = land[id]?.length ?? 0
    return n === 1 ? t('factions.territoryOne') : t('factions.territory', { n })
  }
  /** Whether no faction of the campaign holds land on the map chosen. */
  const bare = $derived(!!own && !own.factions.some((f) => land[f.id]?.length))
  const mapName = (name: string) => name || t('places.untitledMap')
  const mapUrl = $derived(
    map && placeUrl({ app: 'hexmapper', id: map.meta.id, name: map.meta.name }),
  )

  function toggled(id: string, opened: boolean) {
    const view = { name: 'campaign', id: campaign.id, tab: 'factions' } as const
    if (opened) go({ ...view, faction: id }, true)
    else if (faction === id) go(view, true)
  }
</script>

<p class="help">{t('factions.intro')}</p>

{#if own && system}
  <div class="field">
    <span>{t('factions.landOn')}<InfoTip markdown={t('factions.landOnHelp')} /></span>
    {#if map}
      <div class="row">
        {#if open.maps.length > 1}
          <select
            value={map.meta.id}
            aria-label={t('factions.landOn')}
            onchange={(e) => open.chooseLandMap(e.currentTarget.value)}
          >
            {#each open.maps as m (m.meta.id)}
              <option value={m.meta.id}>{mapName(m.meta.name)}</option>
            {/each}
          </select>
        {:else}
          <strong>{mapName(map.meta.name)}</strong>
        {/if}
        {#if mapUrl}<a href={mapUrl}>{t('factions.paintIn')}</a>{/if}
      </div>
      <LandMap {map} {color} label={t('factions.minimap', { map: mapName(map.meta.name) })} />
      <ul class="legend">
        {#each own.factions as f (f.id)}
          <li><span class="swatch" style:background={color(f.id)}></span>{name(f.id)}</li>
        {/each}
      </ul>
      {#if bare}
        <div class="row">
          <button onclick={() => map && open.bringLand(map)}>{t('factions.bringLand')}</button>
          <span class="help"
            >{t('whatItDoes')}<InfoTip markdown={t('factions.bringLandHelp')} /></span
          >
        </div>
      {/if}
    {:else}
      <p class="help">{t('factions.noMaps')}</p>
    {/if}
  </div>

  <span class="label">{t('tabs.factions')}<InfoTip markdown={t('factions.help')} /></span>
  {#each own.factions as f (f.id)}
    <details
      class="faction"
      open={faction === f.id}
      ontoggle={(e) => toggled(f.id, e.currentTarget.open)}
    >
      <summary>
        <span class="swatch" style:background={color(f.id)}></span>
        <strong>{name(f.id)}</strong>
        {#if map}<span class="count">{count(f.id)}</span>{/if}
      </summary>
      {#if about(f.id)}<Markdown class="about" text={about(f.id)} />{/if}
      <FactionNotes
        notes={own.notes?.[f.id]}
        name={name(f.id)}
        locale={getLocale()}
        onchange={(change) => open.setFactions(withNotes(own, f.id, change))}
      />
      <CharacterCard
        sheet={system.sheet.def}
        character={f}
        locale={getLocale()}
        named={false}
        path={`factions.${f.id}`}
        onchange={(next) =>
          open.setFactions({
            ...own,
            factions: own.factions.map((x) => (x.id === next.id ? next : x)),
          })}
      />
    </details>
  {/each}

  <!-- The help beside the button, not on it: pressing it runs the turn. -->
  <div class="row">
    <button onclick={() => open.worldTurn()}>{t('factions.turn')}</button>
    <span class="help">{t('whatItDoes')}<InfoTip markdown={t('factions.turnHelp')} /></span>
  </div>
  {#if system.def.every}
    <label class="check">
      <input
        type="checkbox"
        checked={own.auto !== false}
        onchange={(e) =>
          open.setFactions({ ...own, auto: e.currentTarget.checked ? undefined : false })}
      />
      {t('factions.auto', { days: system.def.every })}<InfoTip markdown={t('factions.autoHelp')} />
    </label>
  {/if}
  <button class="link" onclick={() => open.removeFactions()}>{t('factions.remove')}</button>
{:else if own}
  <p class="help">{t('factions.missing', { system: own.system })}</p>
  <button class="link" onclick={() => open.removeFactions()}>{t('factions.remove')}</button>
{:else if offered}
  <p class="help">{map ? t('factions.none') : t('factions.noneNoMaps')}</p>
  <div class="row">
    <button onclick={() => open.bringFactions()}>{t('factions.bring')}</button>
  </div>
{:else}
  <p class="help">{t('factions.noSystem')}</p>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    font-size: 13px;
  }

  .label {
    align-self: flex-start;
    font-size: 13px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    font-size: 12px;
    list-style: none;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .faction {
    padding: 4px 8px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .faction summary {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .faction[open] summary {
    margin-bottom: 6px;
  }

  .faction :global(.about) {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .swatch {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .count {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  button {
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .link {
    align-self: flex-start;
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
  }

  a {
    color: var(--accent);
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
