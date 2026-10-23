<script lang="ts">
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'
  import { momentsList, reactionIn, writeMoments } from '../../lib/systemDoc.svelte'

  /**
   * The moment written as a condition among an action's `on:` or a check's `at:`: it comes
   * once as its condition turns true. Its condition as rows, and whether it's checked for
   * each member (`for: party.members`). Changes write the whole `on:` / `at:`, keeping its
   * named moments.
   */
  let {
    value,
    hints,
    disabled = false,
    each = true,
    help,
    onchange,
  }: {
    /** The `on:` / `at:` as written. */
    value: unknown
    hints: Record<string, readonly string[]>
    disabled?: boolean
    /** Whether it may be checked for each member (`for: party.members`): a trip's, not the world's. */
    each?: boolean
    /** Its explanation, when it isn't a trip's. */
    help?: string
    onchange: (moments: ReturnType<typeof writeMoments>) => void
  } = $props()

  const reaction = $derived(reactionIn(value))
  const write = (next: Record<string, unknown> | undefined) =>
    onchange(writeMoments(momentsList(value), next ?? null))

  function setWhen(when: unknown) {
    const rest = { ...reaction }
    delete rest.when
    if (when !== undefined) rest.when = when
    // Without when nor unless, it's no moment at all.
    write(rest.when !== undefined || rest.unless !== undefined ? rest : undefined)
  }
  function setEach(each: boolean) {
    if (!reaction) return
    const rest = { ...reaction }
    if (each) rest.for = 'party.members'
    else delete rest.for
    write(rest)
  }
</script>

<div class="reaction">
  <span class="label">{t('reaction.when')}<InfoTip text={help ?? t('reaction.whenHelp')} /></span>
  <ConditionEditor
    value={reaction?.when}
    suggestions={hints}
    locale={getLocale()}
    {disabled}
    label={t('reaction.when')}
    onchange={setWhen}
  />
  {#if reaction && each}
    <label class="each">
      <input
        type="checkbox"
        checked={reaction.for === 'party.members'}
        {disabled}
        onchange={(e) => setEach(e.currentTarget.checked)}
      />
      <span>{t('reaction.each')}<InfoTip text={t('reaction.eachHelp')} /></span>
    </label>
  {/if}
</div>

<style>
  .reaction {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .each {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
</style>
