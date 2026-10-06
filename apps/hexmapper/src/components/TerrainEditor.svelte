<script lang="ts">
  import { confirmAction, tooltip } from '@open-tabletop/ui-kit'
  import { SetTerrainsCommand, terrainUsage } from '../lib/commands/terrains'
  import { en } from '../lib/i18n/en'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { DEFAULT_TERRAINS } from '../lib/model/defaults'
  import { newId } from '../lib/model/id'
  import type { TerrainType } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { builtinSvg, getBuiltinIcon } from '../lib/icons/registry'
  import GlyphPicker from './GlyphPicker.svelte'

  /** Terrain whose glyph picker is open. */
  let picking = $state<string | null>(null)
  const assetUrl = (glyph: string) =>
    editor.map.assets.find((a) => `asset:${a.id}` === glyph)?.dataUrl

  const usage = $derived.by(() => {
    void editor.revision
    return terrainUsage(editor.map)
  })

  function defaultName(terrain: TerrainType): string {
    return terrain.id in en.terrains ? t(`terrains.${terrain.id}` as MessageKey) : ''
  }

  function update(id: string, patch: Partial<TerrainType>) {
    const next = editor.map.terrains.map((terrain) => {
      if (terrain.id !== id) return terrain
      const merged: TerrainType = { ...terrain, ...patch }
      // An empty or default name falls back to the translated built-in one.
      if (!merged.name?.trim() || merged.name.trim() === defaultName(merged)) delete merged.name
      else merged.name = merged.name.trim()
      if (!merged.water) delete merged.water
      if (!merged.glyph) delete merged.glyph
      return merged
    })
    editor.execute(new SetTerrainsCommand(next))
  }

  async function remove(terrain: TerrainType) {
    const count = usage.get(terrain.id) ?? 0
    const name = terrain.name ?? defaultName(terrain)
    if (count > 0 && !(await confirmAction(t('terrainEditor.confirmDelete', { name, count }))))
      return
    editor.execute(new SetTerrainsCommand(editor.map.terrains.filter((x) => x.id !== terrain.id)))
    if (editor.terrainId === terrain.id) editor.terrainId = editor.map.terrains[0]?.id ?? ''
  }

  /** Default terrains this map doesn't have (maps keep the palette they were made with). */
  const missing = $derived(
    DEFAULT_TERRAINS.filter((d) => !editor.terrains.some((x) => x.id === d.id)),
  )

  function addMissing() {
    const terrains = [...editor.map.terrains, ...missing.map((d) => ({ ...d }))]
    editor.execute(new SetTerrainsCommand(terrains))
  }

  function add() {
    const terrain: TerrainType = {
      id: `custom-${newId(6)}`,
      name: t('terrainEditor.newName'),
      color: '#8a8a6a',
    }
    editor.execute(new SetTerrainsCommand([...editor.map.terrains, terrain]))
    editor.terrainId = terrain.id
  }
</script>

<ul>
  {#each editor.terrains as terrain (terrain.id)}
    <li>
      <input
        type="color"
        value={terrain.color}
        aria-label={t('terrainEditor.color')}
        onchange={(e) => update(terrain.id, { color: e.currentTarget.value })}
      />
      <input
        type="text"
        value={terrain.name ?? ''}
        placeholder={defaultName(terrain)}
        aria-label={t('terrainEditor.name')}
        onchange={(e) => update(terrain.id, { name: e.currentTarget.value })}
      />
      <button
        class="glyph"
        style:background={terrain.color}
        use:tooltip={t('terrainEditor.glyph')}
        aria-label={t('terrainEditor.glyph')}
        aria-expanded={picking === terrain.id}
        onclick={() => (picking = picking === terrain.id ? null : terrain.id)}
      >
        {#if terrain.glyph && getBuiltinIcon(terrain.glyph)}
          <!-- Bundled, trusted SVG markup. -->
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html builtinSvg(getBuiltinIcon(terrain.glyph)!)}
        {:else if terrain.glyph && assetUrl(terrain.glyph)}
          <img src={assetUrl(terrain.glyph)} alt="" />
        {:else}
          ∅
        {/if}
      </button>
      <label class="water" use:tooltip={t('terrainEditor.waterHelp')}>
        <input
          type="checkbox"
          checked={!!terrain.water}
          onchange={(e) => update(terrain.id, { water: e.currentTarget.checked })}
        />
        {t('terrainEditor.water')}
      </label>
      <button
        class="icon"
        use:tooltip={t('terrainEditor.delete')}
        aria-label="{t('terrainEditor.delete')}: {terrain.name ?? defaultName(terrain)}"
        onclick={() => remove(terrain)}>✕</button
      >
    </li>
    {#if picking === terrain.id}
      <li class="pick">
        <GlyphPicker
          value={terrain.glyph}
          color={terrain.color}
          onchange={(glyph) => update(terrain.id, { glyph: glyph ?? '' })}
        />
      </li>
    {/if}
  {/each}
</ul>
<button class="add" onclick={add}>{t('terrainEditor.add')}</button>
{#if missing.length}
  <button class="add" onclick={addMissing}
    >{t('terrainEditor.addMissing', { count: missing.length })}</button
  >
{/if}

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  input[type='color'] {
    flex: none;
    width: 28px;
    height: 26px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  input[type='text'] {
    flex: 1;
    min-width: 0;
  }

  .glyph {
    flex: none;
    width: 26px;
    height: 26px;
    padding: 2px;
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .glyph :global(svg),
  .glyph img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.6));
  }

  .pick {
    display: block;
  }

  .water {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .icon {
    height: 26px;
  }

  .add {
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .add:hover {
    border-color: var(--accent);
  }
</style>
