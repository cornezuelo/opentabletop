<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { REGION_BORDER_RANGE, REGION_FILL_RANGE } from '../lib/model/defaults'
  import type { RegionStyle } from '../lib/model/types'

  /**
   * Fill and border of regions. Sliders preview while dragging (`onpreview`) and are
   * recorded as one step on release (`oncommit`); the checkbox commits at once.
   */
  let {
    style,
    onpreview,
    oncommit,
  }: {
    style: RegionStyle
    onpreview: (patch: Partial<RegionStyle>) => void
    oncommit: () => void
  } = $props()

  const percent = (n: number) => `${Math.round(n * 100)} %`
</script>

<label class="field">
  <span
    >{t('regionStyle.fill')}: {style.fill > 0 ? percent(style.fill) : t('regionStyle.none')}<InfoTip
      text={t('regionStyle.fillHelp')}
    /></span
  >
  <input
    type="range"
    min={REGION_FILL_RANGE[0]}
    max={REGION_FILL_RANGE[1]}
    step="0.02"
    value={style.fill}
    oninput={(e) => onpreview({ fill: Number(e.currentTarget.value) })}
    onchange={oncommit}
  />
</label>
<label class="field">
  <span
    >{t('regionStyle.border')}: {style.border > 0
      ? style.border.toFixed(2)
      : t('regionStyle.none')}<InfoTip text={t('regionStyle.borderHelp')} /></span
  >
  <input
    type="range"
    min={REGION_BORDER_RANGE[0]}
    max={REGION_BORDER_RANGE[1]}
    step="0.01"
    value={style.border}
    oninput={(e) => onpreview({ border: Number(e.currentTarget.value) })}
    onchange={oncommit}
  />
</label>
{#if style.border > 0}
  <label class="field">
    <span>{t('regionStyle.borderOpacity')}: {percent(style.borderOpacity)}</span>
    <input
      type="range"
      min="0.1"
      max="1"
      step="0.05"
      value={style.borderOpacity}
      oninput={(e) => onpreview({ borderOpacity: Number(e.currentTarget.value) })}
      onchange={oncommit}
    />
  </label>
  <label class="check">
    <input
      type="checkbox"
      checked={style.dashed}
      onchange={(e) => {
        onpreview({ dashed: e.currentTarget.checked })
        oncommit()
      }}
    />
    {t('regionStyle.dashed')}
  </label>
{/if}
