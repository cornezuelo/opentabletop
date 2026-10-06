<script lang="ts">
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { FONT_FAMILIES } from '../lib/labels/fonts'
  import { CAPTION_SIZE_RANGE } from '../lib/model/defaults'
  import {
    LABEL_FONTS,
    type CaptionKind,
    type CaptionOverride,
    type CaptionStyle,
  } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'

  /**
   * How one element's name is shown on the map (a hex, a region, a token): shown or not,
   * and either the map's style for its kind or its own.
   */
  let {
    kind,
    show,
    style,
    onshow,
    onstyle,
  }: {
    kind: CaptionKind
    show: boolean
    /** The element's own style; absent = the map's. */
    style: CaptionOverride | undefined
    onshow: (show: boolean) => void
    /** `live` while a slider is dragged (preview); undefined = back to the map's style. */
    onstyle: (style: CaptionOverride | undefined, live: boolean) => void
  } = $props()

  let open = $state(false)
  const base = $derived(editor.captions[kind])
  const effective = $derived<CaptionOverride>(style ?? withoutShow(base))
  const hiddenByMap = $derived(!base.show)

  function withoutShow(s: CaptionStyle): CaptionOverride {
    const { show: _show, ...rest } = s
    return rest
  }

  const set = (patch: Partial<CaptionOverride>, live = false) =>
    onstyle({ ...effective, ...patch }, live)
</script>

<div class="names">
  <label class="check">
    <input type="checkbox" checked={show} onchange={(e) => onshow(e.currentTarget.checked)} />
    {t('captions.showOnMap')}
  </label>
  <button class="link" aria-expanded={open} onclick={() => (open = !open)}
    >{open ? t('hex.done') : t('captions.style')}</button
  >
</div>
{#if hiddenByMap && show}
  <p class="note">{t(`captions.hiddenByMap.${kind}` as MessageKey)}</p>
{/if}
{#if open}
  <div class="style">
    <div class="choice" role="radiogroup" aria-label={t('captions.style')}>
      <label>
        <input type="radio" checked={!style} onchange={() => onstyle(undefined, false)} />
        {t('captions.mapStyle')}
      </label>
      <label>
        <input type="radio" checked={!!style} onchange={() => onstyle(effective, false)} />
        {t('captions.ownStyle')}
      </label>
    </div>
    {#if style}
      <label class="field">
        <span>{t('labels.font')}</span>
        <select
          value={effective.font}
          onchange={(e) => set({ font: e.currentTarget.value as CaptionOverride['font'] })}
        >
          {#each LABEL_FONTS as font (font)}
            <option value={font} style:font-family={FONT_FAMILIES[font].family}
              >{FONT_FAMILIES[font].name}</option
            >
          {/each}
        </select>
      </label>
      <label class="field">
        <span>{t('captions.size')}: {Math.round(effective.size * 100)}%</span>
        <input
          type="range"
          min={CAPTION_SIZE_RANGE[0]}
          max={CAPTION_SIZE_RANGE[1]}
          step="0.05"
          value={effective.size}
          oninput={(e) => set({ size: Number(e.currentTarget.value) }, true)}
          onchange={(e) => set({ size: Number(e.currentTarget.value) })}
        />
      </label>
      <div class="field">
        <span>{t('captions.color')}</span>
        <ColorPicker value={effective.color} auto onchange={(color) => set({ color })} />
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={effective.italic}
          onchange={(e) => set({ italic: e.currentTarget.checked })}
        />
        {t('labels.italic')}
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={effective.halo}
          onchange={(e) => set({ halo: e.currentTarget.checked })}
        />
        {t('iconStyle.halo')}
      </label>
      {#if effective.halo}
        <ColorPicker
          value={effective.haloColor}
          onchange={(haloColor) => haloColor && set({ haloColor })}
        />
      {/if}
    {:else}
      <p class="note">{t('captions.mapStyleHelp')}</p>
    {/if}
  </div>
{/if}

<style>
  .names {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .check,
  .choice label {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .choice {
    display: flex;
    gap: 14px;
  }

  .style {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .note {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
