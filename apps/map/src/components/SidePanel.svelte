<script lang="ts">
  import ExportPanel from './ExportPanel.svelte'
  import HexInfo from './hex/HexInfo.svelte'
  import IconPanel from './IconPanel.svelte'
  import LabelPanel from './LabelPanel.svelte'
  import TokenPanel from './tokens/TokenPanel.svelte'
  import LayersPanel from './LayersPanel.svelte'
  import LibraryPanel from './LibraryPanel.svelte'
  import MapCampaign from './MapCampaign.svelte'
  import MapSettings from './MapSettings.svelte'
  import MapStyleSettings from './MapStyleSettings.svelte'
  import MapTreePanel from './MapTreePanel.svelte'
  import MapSystem from './MapSystem.svelte'
  import WorldPanel from './WorldPanel.svelte'
  import FactionsPanel from './FactionsPanel.svelte'
  import MapSize from './MapSize.svelte'
  import PathPanel from './PathPanel.svelte'
  import ConnectionPanel from './ConnectionPanel.svelte'
  import WallPanel from './WallPanel.svelte'
  import PlayPanel from './PlayPanel.svelte'
  import Section from './Section.svelte'
  import TerrainPanel from './TerrainPanel.svelte'
  import CaptionSettings from './CaptionSettings.svelte'
  import RegionPanel from './RegionPanel.svelte'
  import RegionStyleControls from './RegionStyleControls.svelte'
  import { SetRegionStyleCommand } from '../lib/commands/settings'
  import type { HexKey, RegionStyle } from '@open-tabletop/map'
  import { OraclePanel } from '@open-tabletop/oracle-ui'
  import { helpMarkdown, PanelHead, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { addResultAsPoi, oracleUi, rollContext, rollHex } from '../lib/play/oracle'
  import { editSession, sessionOf } from '../lib/play/play'
  import { applyWorldEffects } from '../lib/play/world.svelte'
  import { applyResult, partyOf, tripChanges } from '@open-tabletop/session'
  import { activeSystem } from '../lib/play/systems'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { editor, type Picked, type ToolId } from '../lib/store/editor.svelte'

  const TOOL_TITLES: Record<ToolId, MessageKey> = {
    select: 'panel.hex',
    terrain: 'panel.terrain',
    region: 'panel.regions',
    faction: 'panel.factions',
    path: 'panel.paths',
    connection: 'panel.connections',
    wall: 'panel.walls',
    icon: 'panel.icons',
    text: 'panel.text',
    token: 'panel.tokens',
    play: 'panel.play',
  }
  const back = () => (editor.panelView = 'tool')
  /** What Select picked is shown by the panel of the tool that edits it. */
  const PICKED: Record<Picked['kind'], ToolId> = {
    token: 'token',
    label: 'text',
    connection: 'connection',
    region: 'region',
  }
  const shown = $derived(
    editor.tool === 'select' && editor.mode === 'edit' && editor.picked
      ? PICKED[editor.picked.kind]
      : editor.tool,
  )

  const hexCoord = (hex: HexKey) => formatCoord(parseKey(hex), editor.grid.coordFormat, editor.grid)
  /** Hand-rolled results already applied to the trip (by history item). */
  let applied = $state(new Set<number>())

  /** The map's region style before a slider drag: previewed live, one step on release. */
  let regionStyleBefore: RegionStyle | null = null
  function previewRegionStyle(patch: Partial<RegionStyle>) {
    regionStyleBefore ??= { ...editor.map.regionStyle }
    editor.map.regionStyle = { ...editor.map.regionStyle, ...patch }
    editor.notify({ kind: 'regions' })
  }
  function commitRegionStyle() {
    if (!regionStyleBefore) return
    const after = { ...editor.map.regionStyle }
    editor.map.regionStyle = regionStyleBefore
    regionStyleBefore = null
    editor.execute(new SetRegionStyleCommand({ ...editor.map.regionStyle }, after))
  }
</script>

<aside class="panel">
  {#if editor.panelView === 'settings'}
    <PanelHead title={t('panel.settings')} closeLabel={t('panel.closeSettings')} onclose={back} />
    <Section title={t('panel.map')}><MapSettings /></Section>
    <Section title={t('panel.campaign')}><MapCampaign /><MapSystem /></Section>
    <Section title={t('map.size')}><MapSize /></Section>
    <Section title={t('mapStyle.title')}><MapStyleSettings /></Section>
    <Section title={t('captions.title')}><CaptionSettings /></Section>
    <Section title={t('regionStyle.title')}>
      <p class="help">{t('regionStyle.help')}</p>
      <RegionStyleControls
        style={editor.regionStyle}
        onpreview={previewRegionStyle}
        oncommit={commitRegionStyle}
      />
    </Section>
  {:else if editor.panelView === 'library'}
    <PanelHead title={t('library.title')} closeLabel={t('panel.closeSettings')} onclose={back} />
    <div class="body"><LibraryPanel /></div>
  {:else if editor.panelView === 'oracle'}
    <PanelHead
      title={t('oracle.title')}
      help={t('oracle.help')}
      closeLabel={t('panel.closeSettings')}
      onclose={back}
    />
    {@const hex = rollHex()}
    {@const coord = hex ? hexCoord(hex) : ''}
    <div class="body">
      <OraclePanel ui={oracleUi} context={rollContext()}>
        {#snippet header()}
          <p class="rolls-for" class:none={!hex}>
            {hex
              ? editor.selected
                ? t('oracle.rollsFor', { hex: coord })
                : t('oracle.rollsForParty', { hex: coord })
              : t('oracle.noHex')}
          </p>
        {/snippet}
        {#snippet actions(item)}
          {#if hex && item.resolution.text}
            <button
              class="result-action"
              onclick={() => {
                const text = item.resolution.text
                if (!hex || !text) return
                const def = oracleUi.library.registry.definitions.get(item.source)
                addResultAsPoi(hex, text, oracleUi.displayName(def, item.source))
                showToast(t('oracle.poiAdded', { hex: coord }))
              }}>{t('oracle.addPoi', { hex: coord })}</button
            >
          {/if}
          {@const changes = tripChanges(item.resolution.value)}
          {#if changes.length && editor.play && sessionOf(editor.play)}
            {@const summary = changes
              .map(([key, change]) => {
                // The value's name (its system's, or the app's), not its path.
                const name = oracleUi.valueInfo(key).name ?? key
                return typeof change === 'number'
                  ? `${name} ${change > 0 ? '+' : ''}${change}`
                  : `${name} ${String(change).startsWith('=') ? change : `: ${change}`}`
              })
              .join(', ')}
            <button
              class="result-action"
              disabled={applied.has(item.id)}
              use:tooltip={{ markdown: helpMarkdown(t('oracle.applyHelp')) }}
              onclick={() => {
                const system = activeSystem()
                editSession((session) =>
                  applyResult(
                    session,
                    item.resolution.value,
                    system.bindings?.stats,
                    partyOf(system),
                  ),
                )
                // …and what it does to the world: its clocks, its factions.
                const value = item.resolution.value as { effects?: Record<string, unknown> }
                if (value.effects) applyWorldEffects(value.effects)
                applied = new Set([...applied, item.id])
                showToast(t('oracle.applied', { changes: summary }))
              }}
              >{applied.has(item.id)
                ? t('oracle.appliedButton')
                : t('oracle.apply', { changes: summary })}</button
            >
          {/if}
        {/snippet}
      </OraclePanel>
    </div>
  {:else if editor.panelView === 'world'}
    <PanelHead
      title={t('world.title')}
      help={t('world.help')}
      closeLabel={t('panel.closeSettings')}
      onclose={back}
    />
    <div class="body"><WorldPanel /></div>
  {:else if editor.panelView === 'layers'}
    <PanelHead title={t('panel.layers')} closeLabel={t('panel.closeSettings')} onclose={back} />
    <div class="body"><LayersPanel /></div>
  {:else if editor.panelView === 'tree'}
    <PanelHead
      title={t('panel.tree')}
      help={t('submap.treeHelp')}
      closeLabel={t('panel.closeSettings')}
      onclose={back}
    />
    <div class="body"><MapTreePanel /></div>
  {:else if editor.panelView === 'export'}
    <PanelHead title={t('export.title')} closeLabel={t('panel.closeSettings')} onclose={back} />
    <div class="body"><ExportPanel /></div>
  {:else}
    {@render toolView()}
  {/if}
</aside>

{#snippet toolView()}
  <PanelHead title={t(TOOL_TITLES[shown])} />
  <div class="body">
    {#if shown !== editor.tool && editor.selected}
      <button class="to-cell" onclick={() => (editor.picked = null)}
        >← {t('panel.backToCell', { cell: hexCoord(editor.selected) })}</button
      >
    {/if}
    {#if shown === 'terrain'}
      <TerrainPanel />
    {:else if shown === 'region'}
      <RegionPanel />
    {:else if shown === 'faction'}
      <FactionsPanel paint />
    {:else if shown === 'path'}
      <PathPanel />
    {:else if shown === 'connection'}
      <ConnectionPanel />
    {:else if shown === 'wall'}
      <WallPanel />
    {:else if shown === 'icon'}
      <IconPanel />
    {:else if shown === 'text'}
      <LabelPanel />
    {:else if shown === 'token'}
      <TokenPanel />
    {:else if shown === 'play'}
      <PlayPanel />
    {:else}
      <HexInfo />
    {/if}
  </div>
{/snippet}

<style>
  .panel {
    --trip-pin-room: 12px;
    padding: 12px calc(16px + var(--scroll-room)) 12px 16px;
    overflow-y: auto;
    scrollbar-gutter: stable;
    background: var(--panel);
    border-left: 1px solid var(--panel-border);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
  }

  .to-cell {
    align-self: flex-start;
    padding: 0;
    font: inherit;
    font-size: 12px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .rolls-for {
    margin: 0;
    font-size: 12px;
    color: var(--accent);
  }

  .rolls-for.none {
    color: var(--text-muted);
  }

  .result-action {
    padding: 4px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .result-action:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
