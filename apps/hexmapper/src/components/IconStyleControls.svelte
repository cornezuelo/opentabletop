<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import {
    ICON_DEFAULTS,
    ICON_HALO_RANGE,
    ICON_OUTLINE_RANGE,
    ICON_SCALE_RANGE,
  } from '../lib/model/hex'
  import type { IconStyle } from '../lib/model/types'
  import ColorPicker from './ColorPicker.svelte'

  /**
   * `onchange(style, live)`: live = true while a slider is being dragged (preview),
   * false for the final value (commit).
   */
  let {
    style,
    tintable = true,
    onchange,
  }: {
    style: IconStyle
    tintable?: boolean
    onchange: (style: IconStyle, live: boolean) => void
  } = $props()

  function set(patch: IconStyle, live = false) {
    onchange({ ...style, ...patch }, live)
  }

  const percent = (value: number) => `${Math.round(value * 100)}%`
</script>

<div class="controls">
  {#if tintable}
    <div class="field">
      <span>{t('iconStyle.color')}</span>
      <ColorPicker value={style.color} auto onchange={(color) => set({ color })} />
    </div>
  {/if}

  <label class="field">
    <span>{t('iconStyle.size')}: {percent(style.scale ?? 1)}</span>
    <input
      type="range"
      min={ICON_SCALE_RANGE[0]}
      max={ICON_SCALE_RANGE[1]}
      step="0.05"
      value={style.scale ?? 1}
      oninput={(e) => set({ scale: Number(e.currentTarget.value) }, true)}
      onchange={(e) => set({ scale: Number(e.currentTarget.value) })}
    />
  </label>

  <label class="field">
    <span>{t('iconStyle.rotation')}: {style.rotation ?? 0}°</span>
    <input
      type="range"
      min="0"
      max="345"
      step="15"
      value={style.rotation ?? 0}
      oninput={(e) => set({ rotation: Number(e.currentTarget.value) }, true)}
      onchange={(e) => set({ rotation: Number(e.currentTarget.value) })}
    />
  </label>

  <label class="check">
    <input
      type="checkbox"
      checked={!!style.flip}
      onchange={(e) => set({ flip: e.currentTarget.checked })}
    />
    {t('iconStyle.flip')}
  </label>

  <div class="group">
    <label class="check">
      <input
        type="checkbox"
        checked={!!style.outline}
        onchange={(e) => set({ outline: e.currentTarget.checked })}
      />
      {t('iconStyle.outline')}<InfoTip text={t('iconStyle.outlineHelp')} />
    </label>
    {#if style.outline}
      <ColorPicker
        value={style.outlineColor ?? ICON_DEFAULTS.outlineColor}
        onchange={(outlineColor) => set({ outlineColor })}
      />
      <label class="field">
        <span
          >{t('iconStyle.thickness')}: {percent(
            style.outlineWidth ?? ICON_DEFAULTS.outlineWidth,
          )}</span
        >
        <input
          type="range"
          min={ICON_OUTLINE_RANGE[0]}
          max={ICON_OUTLINE_RANGE[1]}
          step="0.005"
          value={style.outlineWidth ?? ICON_DEFAULTS.outlineWidth}
          oninput={(e) => set({ outlineWidth: Number(e.currentTarget.value) }, true)}
          onchange={(e) => set({ outlineWidth: Number(e.currentTarget.value) })}
        />
      </label>
    {/if}
  </div>

  <div class="group">
    <label class="check">
      <input
        type="checkbox"
        checked={!!style.halo}
        onchange={(e) => set({ halo: e.currentTarget.checked })}
      />
      {t('iconStyle.halo')}<InfoTip text={t('iconStyle.haloHelp')} />
    </label>
    {#if style.halo}
      <ColorPicker
        value={style.haloColor ?? ICON_DEFAULTS.haloColor}
        onchange={(haloColor) => set({ haloColor })}
      />
      <label class="field">
        <span>{t('iconStyle.size')}: {percent(style.haloSize ?? ICON_DEFAULTS.haloSize)}</span>
        <input
          type="range"
          min={ICON_HALO_RANGE[0]}
          max={ICON_HALO_RANGE[1]}
          step="0.02"
          value={style.haloSize ?? ICON_DEFAULTS.haloSize}
          oninput={(e) => set({ haloSize: Number(e.currentTarget.value) }, true)}
          onchange={(e) => set({ haloSize: Number(e.currentTarget.value) })}
        />
      </label>
    {/if}
  </div>

  <button class="reset" onclick={() => onchange({}, false)}>{t('iconStyle.reset')}</button>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .reset {
    align-self: flex-start;
    padding: 2px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
  }
</style>
