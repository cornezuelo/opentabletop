<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { KIND_ORDER } from '@open-tabletop/oracle-ui'
  import {
    FileEditor,
    importZip,
    NewDefinitionDialog,
    NewPackDialog,
    PackPage,
    UndoButtons,
  } from '@open-tabletop/pack-ui'
  import {
    AppShell,
    Dialogs,
    MoreMenu,
    readLastSystem,
    rememberSystem,
    Toasts,
    Welcome,
  } from '@open-tabletop/ui-kit'
  import DefinitionPage from './components/DefinitionPage.svelte'
  import NewSystemDialog from './components/NewSystemDialog.svelte'
  import PackHolds from './components/PackHolds.svelte'
  import StyleView from './components/StyleView.svelte'
  import SystemView from './components/SystemView.svelte'
  import { library, systems } from './lib/packs.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav, showSide } from './lib/nav.svelte'
  import { importedSystem } from './lib/transfer'

  // Opened without a view, it starts on the system last chosen here or in another app.
  const last = location.hash ? undefined : readLastSystem()
  if (last && systems.get(last)) go({ name: 'system', id: last, tab: 'overview' }, true)
  $effect(() => {
    if (nav.view.name === 'system' && systems.get(nav.view.id)) rememberSystem(nav.view.id)
  })

  /** The dialog open from **New**. */
  let making = $state<'system' | 'pack' | 'definition' | null>(null)
  /** The pack on show, where **New → Definition…** starts. */
  const openRoot = $derived(
    nav.view.name === 'pack' || nav.view.name === 'file' || nav.view.name === 'def'
      ? nav.view.root
      : undefined,
  )

  async function importPacks() {
    const packs = await importZip(library, getLocale())
    if (!packs?.length) return
    const system = importedSystem(packs)
    if (system) {
      showSide('systems')
      go({ name: 'system', id: system.id, tab: 'overview' })
    } else {
      showSide('packs')
      go({ name: 'pack', root: packs[0].root })
    }
  }
  const openPack = (root: string) => {
    showSide('packs')
    go({ name: 'pack', root })
  }
</script>

<AppShell
  app="packs"
  name={t('app.title')}
  locale={getLocale()}
  {locales}
  onlocale={(locale) => setLocale(locale as 'en' | 'es')}
  onhome={() => go({ name: 'welcome' })}
  texts={{
    help: t('nav.help'),
    showSidebar: t('nav.showSidebar'),
    hideSidebar: t('nav.hideSidebar'),
    showHelp: t('nav.showHelp'),
    hideHelp: t('nav.hideHelp'),
  }}
>
  {#snippet sidebar()}<Sidebar />{/snippet}
  {#snippet bar()}
    <UndoButtons {library} undoLabel={t('nav.undo')} redoLabel={t('nav.redo')} />
    <MoreMenu label={t('library.new')}>
      {#snippet button()}{t('library.new')} ▾{/snippet}
      <button onclick={() => (making = 'system')}>{t('library.newSystemItem')}</button>
      <button onclick={() => (making = 'pack')}>{t('library.newPack')}</button>
      <button onclick={() => (making = 'definition')}>{t('library.newDefinition')}</button>
      <button onclick={importPacks}>{t('library.importAny')}</button>
    </MoreMenu>
  {/snippet}
  {#snippet help()}<HelpPanel app="packs" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'system'}
    {#key nav.view.id}<SystemView id={nav.view.id} tab={nav.view.tab} item={nav.view.item} />{/key}
  {:else if nav.view.name === 'style'}
    {#key nav.view.ref}<StyleView ref={nav.view.ref} />{/key}
  {:else if nav.view.name === 'pack'}
    {@const root = nav.view.root}
    {#key root}
      <PackPage
        {library}
        locale={getLocale()}
        {root}
        onfile={(path, line) => go({ name: 'file', root, path, line })}
        onpack={openPack}
        ongone={() => go({ name: 'welcome' })}
      >
        {#snippet holds()}<PackHolds {root} />{/snippet}
      </PackPage>
    {/key}
  {:else if nav.view.name === 'def'}
    {#key `${nav.view.root}/${nav.view.kind}/${nav.view.id}`}
      <DefinitionPage
        root={nav.view.root}
        kind={nav.view.kind}
        id={nav.view.id}
        tab={nav.view.tab}
      />
    {/key}
  {:else if nav.view.name === 'file'}
    <FileEditor
      {library}
      locale={getLocale()}
      root={nav.view.root}
      path={nav.view.path}
      line={nav.view.line}
      onpack={openPack}
    />
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')} />
  {/if}
</AppShell>

{#if making === 'system'}
  <NewSystemDialog onclose={() => (making = null)} />
{:else if making === 'pack'}
  <NewPackDialog {library} locale={getLocale()} onclose={() => (making = null)} onmade={openPack} />
{:else if making === 'definition'}
  <NewDefinitionDialog
    {library}
    locale={getLocale()}
    kinds={KIND_ORDER}
    root={openRoot}
    onclose={() => (making = null)}
    onfile={(root, path) => go({ name: 'file', root, path })}
    ondefinition={(id) => {
      const def = library.registry.definitions.get(id)
      const root = library.rootOf(id.split('/')[0])
      if (def && root) go({ name: 'def', root, kind: def.kind, id: def.localId, tab: 'form' })
    }}
  />
{/if}

<Toasts />
<Dialogs />
