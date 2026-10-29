<script lang="ts">
  import { roster, sheetText } from '@open-tabletop/character-ui'
  import { systemName } from '@open-tabletop/session'
  import {
    appUrl,
    showToast,
    SideButtons,
    SideItem,
    SideList,
    Sidebar,
    TagFilter,
    Tabs,
    tooltip,
    InfoTip,
    playing,
  } from '@open-tabletop/ui-kit'
  import { listCampaigns, onLibraryChange } from '@open-tabletop/storage'
  import { allPlaces } from '@open-tabletop/travel-ui'
  import { importCharacters } from '../lib/actions'
  import { templatesOf, templateUrl } from '../lib/bestiary'
  import {
    filterByCampaign,
    filterEntries,
    groupEntries,
    type CampaignFilter,
    type ListEntry,
  } from '../lib/groups'
  import { getLocale, t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /**
   * The left column: the roster and the systems' bestiaries, as two tabs alike: by system,
   * then by sheet where a system has more than one, with a search and a filter by tag.
   */
  type Tab = 'characters' | 'bestiary'
  const tabOf = (name: string): Tab | undefined =>
    name === 'bestiary'
      ? 'bestiary'
      : name === 'character' || name === 'new'
        ? 'characters'
        : undefined
  let tab = $state<Tab>(tabOf(nav.view.name) ?? 'characters')
  // The tab follows the view shown (a link from a copy to its template, the browser's Back).
  $effect(() => {
    const shown = tabOf(nav.view.name)
    if (shown) tab = shown
  })

  const selected = $derived(
    nav.view.name === 'character'
      ? nav.view.id
      : nav.view.name === 'bestiary' && nav.view.bestiary
        ? `${nav.view.bestiary}:${nav.view.template}`
        : undefined,
  )
  /** What's searched and the tags chosen, kept for each tab. */
  const search = $state<Record<Tab, string>>({ characters: '', bestiary: '' })
  const chosen = $state<Record<Tab, string[]>>({ characters: [], bestiary: [] })

  const locale = $derived(getLocale())
  const sheetName = (name: Parameters<typeof sheetText>[0], id: string) =>
    sheetText(name, locale) ?? id

  /**
   * The campaign of every map and trip (`app:id`), to know which campaign each character plays
   * in, read again when maps or trips change; and the campaigns' names.
   */
  let placeCampaign = $state<Record<string, string>>({})
  let campaignName = $state('')
  let version = $state(0)
  $effect(() => onLibraryChange(() => version++))
  $effect(() => {
    void version
    void roster.roster
    void allPlaces().then(
      (places) =>
        (placeCampaign = Object.fromEntries(places.map((p) => [`${p.app}:${p.id}`, p.campaign]))),
    )
  })
  $effect(() => {
    const id = playing.id
    if (!id) return
    void listCampaigns()
      .then((list) => (campaignName = list.find((c) => c.id === id)?.name || id))
      .catch(() => {})
  })
  /** The characters shown: by default, the cast of the campaign being played. */
  let campaignFilter = $state<CampaignFilter>('playing')
  const filter = $derived<CampaignFilter>(
    campaignFilter === 'playing' && !playing.id ? 'all' : campaignFilter,
  )

  const characters = $derived<ListEntry[]>(
    roster.roster.characters.map(({ character, playing: where }) => {
      const found = systems.sheetOf(character.sheet)
      return {
        campaign: where ? placeCampaign[`${where.app}:${where.id}`] : undefined,
        key: character.id,
        name: character.name || character.id,
        tags: character.tags,
        system: found?.system.id ?? '',
        systemTitle: found ? systemName(found.system, locale) : t('nav.otherSheets'),
        sheet: character.sheet,
        sheetTitle: found ? sheetName(found.def.name, character.sheet) : character.sheet,
      }
    }),
  )
  const templates = $derived<ListEntry[]>(
    systems.list.flatMap((system) =>
      templatesOf(system, locale).map((e) => ({
        key: `${e.bestiary}:${e.id}`,
        name: e.name,
        tags: e.tags,
        system: system.id,
        systemTitle: systemName(system, locale),
        sheet: e.sheetId ?? '',
        sheetTitle: e.sheet ? sheetName(e.sheet.name, e.sheetId ?? '') : (e.sheetId ?? ''),
      })),
    ),
  )
  const shownCharacters = $derived(filterByCampaign(characters, filter, playing.id))
  const entries = $derived(tab === 'characters' ? shownCharacters : templates)
  const allTags = $derived([...new Set(entries.flatMap((e) => e.tags))])
  const groups = $derived(
    groupEntries(
      filterEntries(entries, search[tab], chosen[tab]),
      (id) => systems.list.findIndex((s) => s.id === id),
      (id) => systems.list.find((s) => s.id === id)?.sheet.id,
    ),
  )

  /**
   * Templates are made in Systems: at the Bestiary tab of the system of the template shown,
   * else of the first system with one, else Systems itself.
   */
  const newTemplateUrl = $derived.by(() => {
    const shown =
      nav.view.name === 'bestiary' &&
      systems.list.find((s) =>
        s.bestiary?.some((b) => nav.view.name === 'bestiary' && b.id === nav.view.bestiary),
      )
    const system = shown || systems.list.find((s) => s.bestiary?.length)
    return system ? templateUrl(system) : appUrl('systems')
  })

  function open(e: ListEntry) {
    if (tab === 'characters') return go({ name: 'character', id: e.key })
    const at = e.key.lastIndexOf(':')
    go({ name: 'bestiary', bestiary: e.key.slice(0, at), template: e.key.slice(at + 1) })
  }

  let file: HTMLInputElement
  async function imported(e: Event & { currentTarget: HTMLInputElement }) {
    const picked = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!picked) return
    const done = importCharacters(await picked.text())
    if ('error' in done) showToast(t('imported.broken'), 'error')
    else if (!done.names.length) showToast(t('imported.none'), 'error')
    else showToast(t('imported.some', { names: done.names.join(', ') }))
  }
</script>

<Sidebar>
  <Tabs
    tabs={[
      { id: 'characters', label: t('nav.characters') },
      { id: 'bestiary', label: t('nav.bestiary') },
    ]}
    value={tab}
    label={t('nav.lists')}
    prefix="side"
    onchange={(id) => (tab = id)}
  />
  <SideButtons>
    {#if tab === 'characters'}
      <button class="primary" onclick={() => go({ name: 'new' })}>{t('nav.newCharacter')}</button>
      <button use:tooltip={t('nav.importTip')} onclick={() => file.click()}
        >{t('nav.import')}</button
      >
    {:else}
      <a class="primary" href={newTemplateUrl}>{t('nav.newTemplate')}</a>
    {/if}
  </SideButtons>
  <input bind:this={file} type="file" accept=".json,application/json" hidden onchange={imported} />
  {#if tab === 'characters' && characters.length}
    <label class="side-field">
      <span>{t('nav.campaign')}<InfoTip text={t('nav.campaignHelp')} /></span>
      <select
        value={filter}
        onchange={(e) => (campaignFilter = e.currentTarget.value as CampaignFilter)}
      >
        {#if playing.id}<option value="playing">{campaignName || playing.id}</option>{/if}
        <option value="all">{t('nav.allCampaigns')}</option>
        <option value="none">{t('nav.noCampaign')}</option>
      </select>
    </label>
  {/if}
  {#if entries.length}
    <input
      class="side-search"
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search[tab]}
    />
    <TagFilter
      tags={allTags}
      chosen={chosen[tab]}
      label={t('nav.tags')}
      clear={t('nav.clearTags')}
      onchange={(next) => (chosen[tab] = next)}
    />
  {/if}
  <div id="side-panel" role="tabpanel" aria-labelledby="side-tab-{tab}" class="lists">
    {#each groups as group (group.system)}
      <section>
        <h3>{group.title}</h3>
        {#each group.sheets as sheet (sheet.sheet)}
          {#if group.sheets.length > 1}<h4>{sheet.title}</h4>{/if}
          <SideList>
            {#each sheet.entries as e (e.key)}
              <SideItem name={e.name} selected={selected === e.key} onclick={() => open(e)} />
            {/each}
          </SideList>
        {/each}
      </section>
    {:else}
      <p class="side-help">
        {entries.length
          ? t('nav.noMatch')
          : tab === 'characters'
            ? characters.length
              ? t('nav.noneInCampaign')
              : t('nav.empty')
            : t('nav.noTemplates')}
      </p>
    {/each}
  </div>
  <a class="side-link" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</Sidebar>

<style>
  .side-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .lists {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h3 {
    margin: 0 0 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }

  h4 {
    margin: 6px 0 1px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }
</style>
