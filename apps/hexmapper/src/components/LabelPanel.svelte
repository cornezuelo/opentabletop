<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { FONT_FAMILIES } from '../lib/labels/fonts'
  import { LABEL_HALO_RANGE, LABEL_SIZE_RANGE } from '../lib/model/defaults'
  import ColorPicker from './ColorPicker.svelte'
  import { LABEL_FONTS, type LabelStyle, type MapLabel } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { view } from '../lib/store/view'
  import { deleteSelectedLabel } from '../lib/tools/tools'

  const SWATCHES = ['#2b2118', '#f4eedd', '#8b1e1e', '#c8a24a', '#2f5d8a', '#3d6b35']

  let textarea = $state<HTMLTextAreaElement>()

  const label = $derived.by((): MapLabel | null => {
    void editor.revision
    return editor.selectedLabel ? (editor.getLabel(editor.selectedLabel) ?? null) : null
  })

  // A freshly created label: focus its text so typing replaces the placeholder.
  $effect(() => {
    if (editor.focusLabelText === 0) return
    queueMicrotask(() => {
      textarea?.focus()
      textarea?.select()
    })
  })

  /** Every free label of the map, in the order they were made. */
  const all = $derived.by((): MapLabel[] => {
    void editor.revision
    return [...editor.map.labels]
  })
  /** Selects a label and brings it into view. */
  function goTo(l: MapLabel) {
    editor.selectedLabel = l.id
    view.centerOnPoint(l)
  }

  function setStyle(patch: Partial<LabelStyle>, live = false) {
    const id = editor.selectedLabel
    if (!id) return
    const update = (l: MapLabel) => ({ ...l, style: { ...l.style, ...patch } })
    if (live) editor.previewLabel(id, update)
    else editor.updateLabel(id, update)
    editor.labelStyle = { ...editor.labelStyle, ...patch }
  }
</script>

{#if label}
  <label class="field">
    <span>{t('labels.text')}</span>
    <textarea
      bind:this={textarea}
      rows="2"
      value={label.text}
      oninput={(e) => {
        const text = e.currentTarget.value
        editor.previewLabel(label.id, (l) => ({ ...l, text }))
      }}
      onchange={() => editor.commitLabel(label.id)}></textarea>
  </label>

  <label class="field">
    <span>{t('labels.font')}</span>
    <select
      value={label.style.font}
      onchange={(e) => setStyle({ font: e.currentTarget.value as LabelStyle['font'] })}
    >
      {#each LABEL_FONTS as font (font)}
        <option value={font} style:font-family={FONT_FAMILIES[font].family}
          >{FONT_FAMILIES[font].name}</option
        >
      {/each}
    </select>
  </label>

  <label class="field">
    <span>{t('labels.size')}: {Math.round(label.style.size * 100)}%</span>
    <input
      type="range"
      min={LABEL_SIZE_RANGE[0]}
      max={LABEL_SIZE_RANGE[1]}
      step="0.05"
      value={label.style.size}
      oninput={(e) => setStyle({ size: Number(e.currentTarget.value) }, true)}
      onchange={() => editor.commitLabel(label.id)}
    />
  </label>

  <label class="field">
    <span>{t('labels.rotation')}: {label.style.rotation}°</span>
    <input
      type="range"
      min="-90"
      max="90"
      step="5"
      value={label.style.rotation}
      oninput={(e) => setStyle({ rotation: Number(e.currentTarget.value) }, true)}
      onchange={() => editor.commitLabel(label.id)}
    />
  </label>

  <div class="field">
    <span>{t('labels.color')}</span>
    <div class="swatches">
      {#each SWATCHES as color (color)}
        <button
          class="swatch"
          class:active={label.style.color === color}
          style:background={color}
          use:tooltip={color}
          aria-label={color}
          onclick={() => setStyle({ color })}
        ></button>
      {/each}
      <input
        type="color"
        value={label.style.color}
        aria-label={t('iconStyle.custom')}
        onchange={(e) => setStyle({ color: e.currentTarget.value })}
      />
    </div>
  </div>

  <div class="toggles">
    <label>
      <input
        type="checkbox"
        checked={label.style.italic}
        onchange={(e) => setStyle({ italic: e.currentTarget.checked })}
      />
      {t('labels.italic')}
    </label>
    <label>
      <input
        type="checkbox"
        checked={label.style.halo}
        onchange={(e) => setStyle({ halo: e.currentTarget.checked })}
      />
      {t('iconStyle.halo')}
    </label>
    <button class="delete" onclick={deleteSelectedLabel}>{t('labels.delete')}</button>
  </div>
  {#if label.style.halo}
    <div class="group">
      <span>{t('iconStyle.halo')}</span>
      <ColorPicker
        value={label.style.haloColor}
        onchange={(haloColor) => haloColor && setStyle({ haloColor })}
      />
      <label class="field">
        <span>{t('iconStyle.thickness')}: {Math.round(label.style.haloWidth * 100)}%</span>
        <input
          type="range"
          min={LABEL_HALO_RANGE[0]}
          max={LABEL_HALO_RANGE[1]}
          step="0.01"
          value={label.style.haloWidth}
          oninput={(e) => setStyle({ haloWidth: Number(e.currentTarget.value) }, true)}
          onchange={() => editor.commitLabel(label.id)}
        />
      </label>
    </div>
  {/if}
{:else}
  <p class="help">{t('labels.help')}</p>
{/if}

<div class="field">
  <span>{t('labels.list', { count: all.length })}</span>
  {#if all.length}
    <ul class="list">
      {#each all as l (l.id)}
        <li>
          <button
            class="item"
            class:active={l.id === editor.selectedLabel}
            onclick={() => goTo(l)}
            use:tooltip={t('labels.goTo')}
          >
            <span class="text" style:font-family={FONT_FAMILIES[l.style.font].family}
              >{l.text.trim() || t('labels.empty')}</span
            >
            <small>{FONT_FAMILIES[l.style.font].name} · {Math.round(l.style.size * 100)}%</small>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="help">{t('labels.none')}</p>
  {/if}
</div>

<style>
  textarea,
  select {
    width: 100%;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border: 1px solid var(--panel-border);
    border-radius: 50%;
    cursor: pointer;
  }

  .swatch.active {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  input[type='color'] {
    width: 26px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: var(--text);
  }

  .toggles label {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .delete {
    margin-left: auto;
    padding: 3px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .delete:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    color: var(--text-muted);
    background: var(--bg);
    border-radius: 6px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 260px;
    margin: 0;
    padding: 0 var(--scroll-room, 0) 0 0;
    overflow-y: auto;
    list-style: none;
  }

  .item {
    display: flex;
    width: 100%;
    gap: 8px;
    align-items: baseline;
    justify-content: space-between;
    padding: 3px 6px;
    color: var(--text);
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .item:hover {
    background: var(--bg);
  }

  .item.active {
    border-color: var(--accent);
  }

  .item .text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .item small {
    flex: none;
    color: var(--text-muted);
    font-size: 11px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
