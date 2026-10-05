<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { ICON_SCALE_RANGE } from '../lib/model/hex'
  import type { IconStyle } from '../lib/model/types'

  let {
    style,
    tintable = true,
    onchange,
  }: { style: IconStyle; tintable?: boolean; onchange: (style: IconStyle) => void } = $props()

  const SWATCHES = ['#1b1a17', '#f4eedd', '#8b1e1e', '#c8a24a', '#2f5d8a', '#3d6b35', '#5b3a6e']

  function set(patch: IconStyle) {
    onchange({ ...style, ...patch })
  }
</script>

<div class="controls">
  {#if tintable}
    <div class="field">
      <span>{t('iconStyle.color')}</span>
      <div class="swatches">
        <button
          class="auto"
          class:active={!style.color}
          title={t('iconStyle.auto')}
          onclick={() => set({ color: undefined })}>{t('iconStyle.auto')}</button
        >
        {#each SWATCHES as color (color)}
          <button
            class="swatch"
            class:active={style.color === color}
            style:background={color}
            title={color}
            aria-label={color}
            onclick={() => set({ color })}
          ></button>
        {/each}
        <input
          type="color"
          value={style.color ?? '#1b1a17'}
          title={t('iconStyle.custom')}
          aria-label={t('iconStyle.custom')}
          onchange={(e) => set({ color: e.currentTarget.value })}
        />
      </div>
    </div>
  {/if}

  <label class="field">
    <span>{t('iconStyle.size')}: {Math.round((style.scale ?? 1) * 100)}%</span>
    <input
      type="range"
      min={ICON_SCALE_RANGE[0]}
      max={ICON_SCALE_RANGE[1]}
      step="0.05"
      value={style.scale ?? 1}
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
      onchange={(e) => set({ rotation: Number(e.currentTarget.value) })}
    />
  </label>

  <div class="toggles">
    <label>
      <input
        type="checkbox"
        checked={!!style.flip}
        onchange={(e) => set({ flip: e.currentTarget.checked })}
      />
      {t('iconStyle.flip')}
    </label>
    <label>
      <input
        type="checkbox"
        checked={!!style.halo}
        onchange={(e) => set({ halo: e.currentTarget.checked })}
      />
      {t('iconStyle.halo')}
    </label>
    <button class="reset" onclick={() => onchange({})}>{t('iconStyle.reset')}</button>
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  .swatch.active,
  .auto.active {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .auto,
  .reset {
    padding: 2px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
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

  .reset {
    margin-left: auto;
  }
</style>
