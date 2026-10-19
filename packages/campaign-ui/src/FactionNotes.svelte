<script lang="ts">
  import type { FactionNotes } from '@open-tabletop/campaign'
  import { InfoTip, NoteRefInput } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * What the GM keeps on a faction: its page in the notes app (where its lore lives) and a
   * short note of their own. Mechanical state only; the rest is the notes app's.
   */
  let {
    notes,
    name,
    locale,
    onchange,
  }: {
    notes?: FactionNotes
    /** The faction's name, for the suggested page. */
    name: string
    locale: string
    onchange: (change: Partial<FactionNotes>) => void
  } = $props()

  const t = translator(() => locale)
</script>

<div class="notes">
  <label class="field">
    <span>{t('factions.noteRef')}<InfoTip markdown={t('factions.noteRefHelp')} /></span>
    <NoteRefInput
      value={notes?.noteRef ?? ''}
      placeholder={t('factions.noteRefPlaceholder', { name })}
      label={t('factions.noteRef')}
      {locale}
      onchange={(noteRef) => onchange({ noteRef })}
    />
  </label>
  <label class="field">
    <span>{t('factions.note')}<InfoTip markdown={t('factions.noteHelp')} /></span>
    <textarea
      rows="2"
      value={notes?.note ?? ''}
      onchange={(e) => onchange({ note: e.currentTarget.value })}></textarea>
  </label>
</div>

<style>
  .notes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 6px 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field > span {
    font-size: 12px;
    color: var(--text-muted);
  }

  textarea {
    width: 100%;
    resize: vertical;
  }
</style>
