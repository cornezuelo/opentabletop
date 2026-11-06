<script lang="ts">
  import {
    SideCount,
    SideFold,
    SideItem,
    SideList,
    SideTag,
    Sidebar,
    Tabs,
  } from '@open-tabletop/ui-kit'
  import { manifestOf, OlderPacks } from '@open-tabletop/pack-ui'
  import { systemName } from '@open-tabletop/session'
  import { getLocale, t, type MessageKey } from '../lib/i18n'
  import { go, nav, showSide, side, type SideView, type View } from '../lib/nav.svelte'
  import { library, systems, texts } from '../lib/packs.svelte'
  import { staleCopies } from '../lib/transfer'
  import { findInTree, packTree } from '../lib/tree'

  let query = $state('')
  const searching = $derived(!!query.trim())
  /** Folded and unfolded by hand; what's selected unfolds by itself. */
  let open = $state<Record<string, boolean>>({})

  const selected = $derived(nav.view.name === 'system' ? nav.view.id : undefined)
  const rootOfView = $derived(
    nav.view.name === 'pack' || nav.view.name === 'file'
      ? nav.view.root
      : nav.view.name === 'style'
        ? library.rootOf(nav.view.ref.split('/')[0])
        : undefined,
  )

  function origin(root: string | undefined) {
    const pack = library.pack(root ?? '')
    if (!pack) return null
    return pack.overrides ? 'edited' : pack.origin === 'user' ? 'user' : 'bundled'
  }

  const errors = (root: string | undefined) =>
    root ? library.diagnostics(root).filter((d) => d.severity === 'error').length : 0

  const shownSystems = $derived(
    systems.list.filter((s) =>
      systemName(s, getLocale()).toLowerCase().includes(query.trim().toLowerCase()),
    ),
  )

  const branches = $derived(
    library.packs
      .map((pack) => {
        const whole = packTree(library, pack.root, {
          locale: getLocale(),
          systems: systems.list,
          displayName: texts.displayName,
        })
        const name = manifestOf(pack).name ?? pack.root
        const inName = name.toLowerCase().includes(query.trim().toLowerCase())
        return { pack, name, tree: inName ? whole : findInTree(whole, query), inName }
      })
      .filter((b) => !searching || b.inName || b.tree.groups.length)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  const kindName = (kind: string) => {
    const key = `library.kindNames.${kind}` as MessageKey
    const name = t(key)
    return name === key ? kind : name
  }
  /** Whether a view is the one showing. */
  function showing(view: View): boolean {
    const now = nav.view
    if (now.name !== view.name) return false
    if (now.name === 'file' && view.name === 'file')
      return now.root === view.root && now.path === view.path
    if (now.name === 'style' && view.name === 'style') return now.ref === view.ref
    return false
  }
  const isOpen = (key: string, holdsShown: boolean) => searching || (open[key] ?? holdsShown)
</script>

<Sidebar>
  <Tabs
    tabs={[
      { id: 'systems' as SideView, label: t('nav.systems') },
      { id: 'packs' as SideView, label: t('library.packsTab') },
    ]}
    value={side.view}
    label={t('library.sideLabel')}
    prefix="side"
    onchange={showSide}
  />
  <input type="search" placeholder={t('library.search')} bind:value={query} />
  <div id="side-panel" class="lists" role="tabpanel" aria-labelledby="side-tab-{side.view}">
    {#if side.view === 'systems'}
      <SideList>
        {#each shownSystems as s (s.id)}
          {@const root = library.rootOf(s.id)}
          {@const o = origin(root)}
          {@const count = errors(root)}
          <SideItem
            name={systemName(s, getLocale())}
            detail={[
              o && t(`origin.${o}`),
              library.pack(root ?? '')?.personal && t('origin.personal'),
            ]
              .filter(Boolean)
              .join(' · ')}
            selected={selected === s.id}
            onclick={() => go({ name: 'system', id: s.id, tab: 'overview' })}
          >
            {#if library.bundledChanges(root ?? '').length}
              <SideTag kind="updated" tip={t('edit.updatedTip')}>{t('origin.updated')}</SideTag>
            {:else if staleCopies(s).length}
              <SideTag kind="updated" tip={t('edit.staleTip')}>{t('origin.updated')}</SideTag>
            {/if}
            {#if count}<SideCount {count} tip={t('nav.problems', { count })} />{/if}
          </SideItem>
        {/each}
      </SideList>
    {:else}
      <SideList>
        {#each branches as { pack, name, tree } (pack.root)}
          {@const count = errors(pack.root)}
          {@const o = origin(pack.root)}
          <SideFold
            {name}
            open={isOpen(pack.root, rootOfView === pack.root)}
            selected={nav.view.name === 'pack' && nav.view.root === pack.root}
            onclick={() => go({ name: 'pack', root: pack.root })}
            ontoggle={() => (open[pack.root] = !isOpen(pack.root, rootOfView === pack.root))}
          >
            {#snippet tags()}
              {#if o}<SideTag>{t(`origin.${o}`)}</SideTag>{/if}
              {#if count}<SideCount {count} tip={t('nav.problems', { count })} />{/if}
            {/snippet}
            {#each tree.systems as s (s.id)}
              <SideItem
                name={`⚙ ${systemName(s, getLocale())}`}
                onclick={() => {
                  showSide('systems')
                  go({ name: 'system', id: s.id, tab: 'overview' })
                }}
              />
            {/each}
            {#each tree.groups as g (g.kind)}
              {@const key = `${pack.root}|${g.kind}`}
              {@const holds = g.items.some((i) => showing(i.view))}
              <SideFold
                name={`${kindName(g.kind)} (${g.items.length})`}
                open={isOpen(key, holds)}
                onclick={g.items.length === 1 ? () => go(g.items[0].view) : undefined}
                ontoggle={() => (open[key] = !isOpen(key, holds))}
              >
                {#each g.items as item (item.key)}
                  <SideItem
                    name={item.name}
                    selected={showing(item.view)}
                    onclick={() => go(item.view)}
                  />
                {/each}
              </SideFold>
            {/each}
            {#if tree.images}
              <SideItem
                name={`${t('library.images')} (${tree.images})`}
                onclick={() => go({ name: 'pack', root: pack.root })}
              />
            {/if}
          </SideFold>
        {/each}
      </SideList>
    {/if}
    <OlderPacks {library} locale={getLocale()} />
  </div>
</Sidebar>

<style>
  .lists {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
