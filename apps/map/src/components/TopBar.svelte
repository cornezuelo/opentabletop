<script lang="ts">
  import {
    AppBrand,
    AppSwitcher,
    CampaignChip,
    MoreMenu,
    playIn,
    PreferencesButton,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { getCampaign } from '@open-tabletop/storage'
  import LineIcon, { type LineIconName } from './LineIcon.svelte'
  import {
    getLocale,
    locales,
    setLocale,
    t,
    type Locale,
    type MessageKey,
  } from '../lib/i18n/index.svelte'
  import { library, newMap, openLibraryMap, saveMap } from '../lib/io/actions.svelte'
  import { editor, type PanelView } from '../lib/store/editor.svelte'

  /**
   * The bar across the top, like in every app: the app and the app switcher on the left;
   * what you do with the map and the panel's views on the right. The open map's name is in
   * the bar and in the window's title ("Map - The Grey Marches").
   */
  $effect(() => {
    const name = editor.meta.name.trim()
    document.title = name ? `${t('app.title')} - ${name}` : t('app.title')
  })
  /**
   * The bar's **Playing** follows the open map's campaign once it's kept (a new map's is kept
   * with its first change; until then it plays in no campaign anyone else sees).
   */
  let held = $state<string>()
  $effect(() => {
    void library.version
    const id = editor.setup.id
    if (!library.loaded) return
    void getCampaign(id)
      .then((kept) => {
        if (editor.setup.id !== id) return
        held = kept ? id : undefined
        if (kept) playIn(id)
      })
      .catch(() => {})
  })
  const toggle = (panel: PanelView) => () =>
    (editor.panelView = editor.panelView === panel ? 'tool' : panel)

  type Action = {
    label: MessageKey
    glyph: LineIconName
    run: () => void
    enabled?: () => boolean
    /** A view of the side panel: shown pressed while it's open. */
    panel?: PanelView
    /** Shown pressed while this holds (a column that isn't a panel view). */
    active?: () => boolean
  }
  const pressed = (action: Action) =>
    action.active ? action.active() : !!action.panel && editor.panelView === action.panel
  const groups: Action[][] = [
    [
      {
        label: 'actions.undo',
        glyph: 'undo',
        run: () => editor.undo(),
        enabled: () => editor.canUndo,
      },
      {
        label: 'actions.redo',
        glyph: 'redo',
        run: () => editor.redo(),
        enabled: () => editor.canRedo,
      },
    ],
    [
      { label: 'actions.new', glyph: 'new', run: newMap },
      { label: 'actions.open', glyph: 'folder', run: toggle('library'), panel: 'library' },
      { label: 'actions.save', glyph: 'save', run: saveMap },
      { label: 'actions.export', glyph: 'export', run: toggle('export'), panel: 'export' },
    ],
    [
      { label: 'panel.layers', glyph: 'layers', run: toggle('layers'), panel: 'layers' },
      { label: 'panel.tree', glyph: 'tree', run: toggle('tree'), panel: 'tree' },
      { label: 'panel.settings', glyph: 'map', run: toggle('settings'), panel: 'settings' },
      {
        label: 'actions.help',
        glyph: 'help',
        run: () => (editor.helpOpen = !editor.helpOpen),
        active: () => editor.helpOpen,
      },
    ],
  ]
</script>

<header class="bar">
  <span class="name"><AppBrand app="map" name={t('app.title')} /></span>
  <AppSwitcher current="map" locale={getLocale()} />
  <CampaignChip locale={getLocale()} {held} />
  <!-- The open map, after the maps above it if it's a sub-map, each opening its map. -->
  <nav class="crumbs" aria-label={t('submap.breadcrumb')}>
    {#each editor.linked.ancestors as above (above.id)}
      <button class="crumb" onclick={() => openLibraryMap(above.id)}
        >{above.name || t('map.untitled')}</button
      ><span class="crumb-sep" aria-hidden="true">›</span>
    {/each}
    <button class="crumb here" onclick={toggle('settings')}
      >{editor.meta.name || t('map.untitled')}</button
    >
  </nav>
  <!-- Editing or playing: what's on the rail and which tools' keys work. -->
  <div class="modes" role="radiogroup" aria-label={t('modes.label')}>
    {#each ['edit', 'play'] as const as mode (mode)}
      <button
        role="radio"
        aria-checked={editor.mode === mode}
        class:on={editor.mode === mode}
        onclick={() => editor.switchMode(mode)}>{t(`modes.${mode}`)}</button
      >
    {/each}
  </div>
  <div class="spacer"></div>
  {#each groups as group, g (g)}
    {#if g > 0}<span class="sep wide" aria-hidden="true"></span>{/if}
    {#each group as action (action.label)}
      <!-- Preferences next to Help, as in every app. -->
      {#if action.label === 'actions.help'}
        <PreferencesButton
          locale={getLocale()}
          {locales}
          onlocale={(locale) => setLocale(locale as Locale)}
        />
      {/if}
      <button
        class="wide"
        class:active={pressed(action)}
        use:tooltip={t(action.label)}
        aria-label={t(action.label)}
        aria-pressed={action.panel || action.active ? pressed(action) : undefined}
        disabled={action.enabled ? !action.enabled() : false}
        onclick={action.run}
      >
        <LineIcon name={action.glyph} />
      </button>
    {/each}
  {/each}
  <!-- A phone has no room for them side by side. -->
  <div class="narrow">
    <MoreMenu label={t('actions.more')}>
      {#each groups.flat() as action (action.label)}
        <button disabled={action.enabled ? !action.enabled() : false} onclick={action.run}
          >{t(action.label)}</button
        >
      {/each}
    </MoreMenu>
  </div>
</header>

<style>
  .crumbs {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    white-space: nowrap;
  }

  .crumbs .crumb {
    flex: 0 1 auto;
    width: auto;
    height: auto;
    min-width: 3em;
    max-width: 16em;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .crumbs button.crumb:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .crumb.here {
    color: var(--text);
  }

  .crumb-sep {
    color: var(--text-muted);
  }

  .bar {
    display: flex;
    gap: 4px;
    align-items: center;
    min-width: 0;
    padding: 6px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-border);
  }

  .bar :global(.brand) {
    margin-right: 4px;
  }

  .narrow {
    display: none;
  }

  /* The menu's are lines of text, not the bar's icons. */
  .narrow button {
    width: 100%;
    height: auto;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--text);
    text-align: left;
    white-space: nowrap;
  }

  /* Narrow windows: the app's icon without its name, the map's actions in one menu. */
  @media (max-width: 760px) {
    .name :global(.brand > span),
    .crumbs,
    .wide {
      display: none;
    }

    .narrow {
      display: block;
    }

    .modes {
      margin-left: 0;
    }

    .bar :global(.chip) {
      min-width: 0;
      overflow: hidden;
    }

    .bar :global(.chip .toggle) {
      max-width: 34vw;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .spacer {
    flex: 1;
  }

  .modes {
    display: flex;
    flex: none;
    margin-left: 12px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .modes button {
    width: auto;
    height: 26px;
    padding: 0 12px;
    font-size: 13px;
    border: none;
    border-radius: 6px;
  }

  .modes button.on {
    color: var(--panel);
    background: var(--accent);
  }

  .modes button.on:hover {
    color: var(--panel);
  }

  .sep {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: var(--panel-border);
  }

  button {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 16px;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  button.active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
