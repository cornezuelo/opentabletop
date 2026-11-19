<script lang="ts">
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'

  /**
   * A bestiary's or a template's `follows`: whether copies go along with the party as it
   * leaves their place: unsaid, never (`false`), always (`true`) or while a condition holds
   * (rows, read with the copy acting).
   */
  let {
    value,
    hints,
    disabled = false,
    unsaid,
    onchange,
  }: {
    value: unknown
    /** What conditions can read (`contextSuggestions`). */
    hints: Record<string, readonly string[]>
    disabled?: boolean
    /** What the empty choice means here (the bestiary's, or "they don't"). */
    unsaid: string
    onchange: (next: boolean | Record<string, unknown> | undefined) => void
  } = $props()

  const mode = $derived(
    value === true ? 'always' : value === false ? 'never' : value === undefined ? '' : 'while',
  )
</script>

<div class="follows">
  <label>
    <span>{t('bestiaryForm.follows')}<InfoTip markdown={t('bestiaryForm.followsHelp')} /></span>
    <select
      value={mode}
      {disabled}
      onchange={(e) => {
        const next = e.currentTarget.value
        onchange(
          next === 'always'
            ? true
            : next === 'never'
              ? false
              : next === 'while'
                ? { 'acting.conditions': 'hostile' }
                : undefined,
        )
      }}
    >
      <option value="">{unsaid}</option>
      <option value="never">{t('bestiaryForm.followsNever')}</option>
      <option value="always">{t('bestiaryForm.followsAlways')}</option>
      <option value="while">{t('bestiaryForm.followsWhile')}</option>
    </select>
  </label>
  {#if mode === 'while'}
    <ConditionEditor
      {value}
      suggestions={hints}
      locale={getLocale()}
      {disabled}
      label={t('bestiaryForm.follows')}
      onchange={(c) => onchange(c ?? true)}
    />
  {/if}
</div>

<style>
  .follows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
    max-width: 260px;
  }
</style>
