<script lang="ts">
  import { SetTerrainsCommand, terrainUsage } from '../lib/commands/terrains'
  import { en } from '../lib/i18n/en'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { newId } from '../lib/model/id'
  import type { TerrainType } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'

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
      return merged
    })
    editor.execute(new SetTerrainsCommand(next))
  }

  function remove(terrain: TerrainType) {
    const count = usage.get(terrain.id) ?? 0
    const name = terrain.name ?? defaultName(terrain)
    if (count > 0 && !confirm(t('terrainEditor.confirmDelete', { name, count }))) return
    editor.execute(new SetTerrainsCommand(editor.map.terrains.filter((x) => x.id !== terrain.id)))
    if (editor.terrainId === terrain.id) editor.terrainId = editor.map.terrains[0]?.id ?? ''
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
      <label class="water" title={t('terrainEditor.waterHelp')}>
        <input
          type="checkbox"
          checked={!!terrain.water}
          onchange={(e) => update(terrain.id, { water: e.currentTarget.checked })}
        />
        {t('terrainEditor.water')}
      </label>
      <button
        class="icon"
        title={t('terrainEditor.delete')}
        aria-label="{t('terrainEditor.delete')}: {terrain.name ?? defaultName(terrain)}"
        onclick={() => remove(terrain)}>✕</button
      >
    </li>
  {/each}
</ul>
<button class="add" onclick={add}>{t('terrainEditor.add')}</button>

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
