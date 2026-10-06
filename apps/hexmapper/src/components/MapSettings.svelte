<script lang="ts">
  import { SetMetaCommand } from '../lib/commands/settings'
  import { t } from '../lib/i18n/index.svelte'
  import type { GridSettings } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { applySettings } from '../lib/store/settings'
  import { showToast } from '@open-tabletop/ui-kit'

  async function copyId() {
    try {
      await navigator.clipboard.writeText(editor.meta.id)
      showToast(t('map.idCopied'))
    } catch {
      // Clipboard blocked (e.g. insecure context): the id is still selectable.
    }
  }

  function setName(input: HTMLInputElement) {
    const name = input.value.trim()
    if (name !== editor.meta.name) editor.execute(new SetMetaCommand({ name }))
  }
</script>

<label class="field">
  <span>{t('map.name')}</span>
  <input
    type="text"
    value={editor.meta.name}
    placeholder={t('map.untitled')}
    onchange={(e) => setName(e.currentTarget)}
  />
</label>

<div class="field">
  <span>{t('map.id')}</span>
  <div class="id">
    <code>{editor.meta.id}</code>
    <button class="icon" title={t('map.copyId')} aria-label={t('map.copyId')} onclick={copyId}
      >⧉</button
    >
  </div>
</div>

<label class="field">
  <span>{t('map.hexKm')}</span>
  <input
    type="number"
    min="0.1"
    step="any"
    value={editor.scale.hexKm}
    onchange={(e) => {
      const value = Number(e.currentTarget.value)
      if (Number.isFinite(value) && value > 0) applySettings({ scale: { hexKm: value } })
      else e.currentTarget.value = String(editor.scale.hexKm)
    }}
  />
</label>

<label class="field">
  <span>{t('map.orientation')}</span>
  <select
    value={editor.grid.orientation}
    onchange={(e) =>
      applySettings({
        grid: { orientation: e.currentTarget.value as GridSettings['orientation'] },
      })}
  >
    <option value="flat">{t('map.flat')}</option>
    <option value="pointy">{t('map.pointy')}</option>
  </select>
</label>

<label class="field">
  <span>{t('map.coordFormat')}</span>
  <select
    value={editor.grid.coordFormat}
    onchange={(e) =>
      applySettings({
        grid: { coordFormat: e.currentTarget.value as GridSettings['coordFormat'] },
      })}
  >
    <option value="CCRR">{t('map.coordCCRR')}</option>
    <option value="axial">{t('map.coordAxial')}</option>
  </select>
</label>

<style>
  .id {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  code {
    flex: 1;
    padding: 4px 8px;
    color: var(--text);
    background: var(--bg);
    border-radius: 4px;
    user-select: all;
  }

  .id .icon {
    height: 28px;
  }

  select {
    width: 100%;
  }
</style>
