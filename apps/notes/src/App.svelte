<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { writingShortcuts } from '@open-tabletop/notes-ui'
  import { AppShell, Dialogs, playing, Toasts, Welcome } from '@open-tabletop/ui-kit'
  import PageView from './components/PageView.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { editing } from './lib/editing.svelte'
  import { getLocale, locales, setLocale, t, ui } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { newPageIn, notes, openRef, startNotes } from './lib/notes.svelte'

  let side = $state<Sidebar>()

  onMount(() => {
    let stop: (() => void) | undefined
    void startNotes().then((s) => (stop = s))
    return () => stop?.()
  })

  // A `noteRef` from another app: the page it reaches, or a new one, once the pages are read.
  $effect(() => {
    const view = nav.view
    if (view.name === 'ref' && notes.loaded) untrack(() => void openRef(view))
  })

  function keydown(e: KeyboardEvent) {
    // The editor's own keys (Ctrl+K links there) were taken already.
    if (e.defaultPrevented || !(e.ctrlKey || e.metaKey) || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === 'e' && nav.view.name === 'page') {
      e.preventDefault()
      editing.on = !editing.on
    } else if (key === 'k') {
      e.preventDefault()
      side?.focusSearch()
    } else if (key === 'n' && e.shiftKey) {
      e.preventDefault()
      void newPageIn(playing.id)
    }
  }

  const shortcuts = $derived([
    {
      title: t('page.keys'),
      shortcuts: [
        { keys: ['Ctrl+E'], does: t('page.keyToggle') },
        { keys: ['Ctrl+K'], does: t('page.keySearch') },
        { keys: ['Ctrl+Shift+N'], does: t('page.keyNew') },
      ],
    },
    writingShortcuts(ui),
  ])
</script>

<svelte:window onkeydown={keydown} />

<AppShell
  app="notes"
  name={t('app.title')}
  locale={getLocale()}
  {locales}
  onlocale={(locale) => setLocale(locale as 'en' | 'es')}
  onhome={() => go({ name: 'welcome' })}
  {shortcuts}
  texts={{
    help: t('nav.help'),
    showSidebar: t('nav.showSidebar'),
    hideSidebar: t('nav.hideSidebar'),
    showHelp: t('nav.showHelp'),
    hideHelp: t('nav.hideHelp'),
  }}
>
  {#snippet sidebar()}<Sidebar bind:this={side} />{/snippet}
  {#snippet help()}<HelpPanel app="notes" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'page'}
    <PageView id={nav.view.id} heading={nav.view.heading} />
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')}>
      <button class="primary" onclick={() => newPageIn(playing.id)}>{t('welcome.start')}</button>
    </Welcome>
  {/if}
</AppShell>

<Toasts />
<Dialogs />
