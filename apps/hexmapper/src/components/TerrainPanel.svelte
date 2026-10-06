<script lang="ts">
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { editor, MAX_BRUSH_RADIUS, type TerrainMode } from '../lib/store/editor.svelte'
  import { terrainName } from '../lib/terrainName'
  import TerrainEditor from './TerrainEditor.svelte'
  import { SetGlyphOpacityCommand } from '../lib/commands/settings'

  /** Glyph opacity while dragging the slider; recorded as one step on release. */
  let glyphsBefore: number | null = null

  function previewGlyphs(value: number) {
    glyphsBefore ??= editor.map.grid.glyphs
    editor.map.grid.glyphs = value
    editor.notify({ kind: 'style' })
  }

  function commitGlyphs(value: number) {
    const before = glyphsBefore ?? editor.map.grid.glyphs
    glyphsBefore = null
    editor.map.grid.glyphs = before
    if (before !== value) editor.execute(new SetGlyphOpacityCommand(before, value))
  }

  let editing = $state(false)

  const modes: { id: TerrainMode; label: MessageKey; glyph: string }[] = [
    { id: 'brush', label: 'terrainMode.brush', glyph: '🖌' },
    { id: 'fill', label: 'terrainMode.fill', glyph: '🪣' },
    { id: 'erase', label: 'terrainMode.erase', glyph: '⌫' },
  ]
</script>

<div class="modes" role="radiogroup">
  {#each modes as mode (mode.id)}
    <button
      role="radio"
      aria-checked={editor.terrainMode === mode.id}
      class:active={editor.terrainMode === mode.id}
      title={t(mode.label)}
      onclick={() => (editor.terrainMode = mode.id)}
    >
      <span aria-hidden="true">{mode.glyph}</span>
      {t(mode.label).replace(/\s*\(.*\)$/, '')}
    </button>
  {/each}
</div>

{#if editor.terrainMode !== 'fill'}
  <label class="slider">
    <span>{t('panel.brushSize')}: {editor.brushRadius + 1}</span>
    <input type="range" min="0" max={MAX_BRUSH_RADIUS} bind:value={editor.brushRadius} />
  </label>
{/if}

<label class="slider">
  <span>{t('terrainEditor.glyphs')}: {Math.round(editor.grid.glyphs * 100)} %</span>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={editor.grid.glyphs}
    oninput={(e) => previewGlyphs(Number(e.currentTarget.value))}
    onchange={(e) => commitGlyphs(Number(e.currentTarget.value))}
  />
</label>

<div class="palette-header">
  <span>{t('terrainEditor.palette')}</span>
  <button class="link" onclick={() => (editing = !editing)}
    >{editing ? t('hex.done') : t('terrainEditor.edit')}</button
  >
</div>

{#if editing}
  <TerrainEditor />
{:else}
  <div class="palette" role="radiogroup">
    {#each editor.terrains as terrain (terrain.id)}
      <button
        role="radio"
        aria-checked={editor.terrainId === terrain.id}
        class:active={editor.terrainId === terrain.id}
        onclick={() => {
          editor.terrainId = terrain.id
          if (editor.terrainMode === 'erase') editor.terrainMode = 'brush'
        }}
      >
        <span class="swatch" style:background={terrain.color}></span>
        {terrainName(terrain)}
      </button>
    {/each}
  </div>
{/if}

<style>
  .modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .modes button,
  .palette button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }

  .modes button {
    justify-content: center;
    font-size: 12px;
  }

  button.active {
    border-color: var(--accent);
  }

  .slider {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
  }

  .palette-header {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
  }

  .palette {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .swatch {
    flex: none;
    width: 16px;
    height: 16px;
    border: 1px solid rgb(0 0 0 / 0.4);
    border-radius: 3px;
  }
</style>
