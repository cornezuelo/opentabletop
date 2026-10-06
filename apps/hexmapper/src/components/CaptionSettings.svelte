<script lang="ts">
  import { SetCaptionsCommand } from '../lib/commands/settings'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { FONT_FAMILIES } from '../lib/labels/fonts'
  import { CAPTION_SIZE_RANGE } from '../lib/model/defaults'
  import {
    CAPTION_KINDS,
    LABEL_FONTS,
    type CaptionKind,
    type CaptionStyle,
  } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import ColorPicker from './ColorPicker.svelte'

  /** Whether each kind of map text is shown, and how it looks. */
  let open = $state<CaptionKind | null>(null)
  /** Captions before a slider drag, recorded as one step on release. */
  let before: typeof editor.map.captions | null = null

  function preview(kind: CaptionKind, patch: Partial<CaptionStyle>) {
    before ??= structuredClone(editor.map.captions)
    editor.map.captions = {
      ...editor.map.captions,
      [kind]: { ...editor.map.captions[kind], ...patch },
    }
    editor.notify({ kind: 'style' })
  }

  function commit() {
    if (!before) return
    const after = structuredClone(editor.map.captions)
    editor.map.captions = before
    before = null
    if (JSON.stringify(after) !== JSON.stringify(editor.map.captions))
      editor.execute(new SetCaptionsCommand(structuredClone(editor.map.captions), after))
  }

  function set(kind: CaptionKind, patch: Partial<CaptionStyle>) {
    preview(kind, patch)
    commit()
  }
</script>

<p class="help">{t('captions.help')}</p>
{#each CAPTION_KINDS as kind (kind)}
  {@const style = editor.captions[kind]}
  <div class="kind">
    <label class="check">
      <input
        type="checkbox"
        checked={style.show}
        onchange={(e) => set(kind, { show: e.currentTarget.checked })}
      />
      {t(`captions.kinds.${kind}` as MessageKey)}
    </label>
    <button
      class="link"
      aria-expanded={open === kind}
      onclick={() => (open = open === kind ? null : kind)}
      >{open === kind ? t('hex.done') : t('captions.style')}</button
    >
  </div>
  {#if open === kind}
    <div class="style">
      <label class="field">
        <span>{t('labels.font')}</span>
        <select
          value={style.font}
          onchange={(e) => set(kind, { font: e.currentTarget.value as CaptionStyle['font'] })}
        >
          {#each LABEL_FONTS as font (font)}
            <option value={font} style:font-family={FONT_FAMILIES[font].family}
              >{FONT_FAMILIES[font].name}</option
            >
          {/each}
        </select>
      </label>
      <label class="field">
        <span>{t('captions.size')}: {Math.round(style.size * 100)}%</span>
        <input
          type="range"
          min={CAPTION_SIZE_RANGE[0]}
          max={CAPTION_SIZE_RANGE[1]}
          step="0.05"
          value={style.size}
          oninput={(e) => preview(kind, { size: Number(e.currentTarget.value) })}
          onchange={commit}
        />
      </label>
      <div class="field">
        <span>{t('captions.color')}</span>
        <ColorPicker value={style.color} auto onchange={(color) => set(kind, { color })} />
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={style.italic}
          onchange={(e) => set(kind, { italic: e.currentTarget.checked })}
        />
        {t('labels.italic')}
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={style.halo}
          onchange={(e) => set(kind, { halo: e.currentTarget.checked })}
        />
        {t('iconStyle.halo')}
      </label>
      {#if style.halo}
        <ColorPicker
          value={style.haloColor}
          onchange={(haloColor) => haloColor && set(kind, { haloColor })}
        />
      {/if}
    </div>
  {/if}
{/each}

<style>
  .kind {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .style {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
