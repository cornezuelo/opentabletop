<script lang="ts">
  import {
    rollAgain,
    startRolls,
    type CharacterState,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { confirmAction, InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { sheetText } from './texts'

  /**
   * What a new character rolled as it was made (its values whose start is dice), and
   * **Roll again**, while nothing has changed them yet; nothing otherwise.
   */
  let {
    sheet,
    character,
    locale,
    onchange,
  }: {
    sheet: Sheet
    character: CharacterState
    locale: string
    onchange: (next: CharacterState) => void
  } = $props()

  const t = $derived(translator(() => locale))
  const rolls = $derived(startRolls(sheet, character))

  async function again() {
    if (!(await confirmAction(t('startRolls.confirm')))) return
    onchange(rollAgain(sheet, character, `${character.id}|${Math.random()}`))
  }
</script>

{#if rolls.length}
  <section class="start-rolls">
    <p class="overline">
      {t('startRolls.title')}<InfoTip markdown={t('startRolls.help')} />
    </p>
    <ul>
      {#each rolls as roll (roll.id)}
        <li>
          {t('startRolls.roll', {
            name: sheetText(sheet.values[roll.id]?.name, locale) ?? roll.id,
            dice: roll.dice,
          })}
          <strong>{roll.value}</strong>
        </li>
      {/each}
    </ul>
    <button type="button" onclick={again}>{t('startRolls.again')}</button>
  </section>
{/if}

<style>
  .start-rolls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
    padding: 8px 12px;
    border: 1px dashed var(--panel-border);
    border-radius: 8px;
  }

  .overline {
    margin: 0;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  strong {
    font-size: 16px;
  }

  button {
    margin-left: auto;
  }
</style>
