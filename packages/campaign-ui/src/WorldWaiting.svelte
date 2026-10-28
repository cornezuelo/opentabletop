<script lang="ts">
  import type { WaitingSaid } from '@open-tabletop/campaign'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * What the campaign's world waits for (a reaction's pause or question), and how to go on:
   * **Go on**, or one of the question's choices. Shown wherever the world is played (the
   * world clock, a trip going on in the campaign).
   */
  let {
    locale,
    waiting,
    onanswer,
  }: {
    locale: string
    waiting: WaitingSaid
    /** Goes on: with a choice's id after a question, without one after a pause. */
    onanswer: (choice?: string) => void
  } = $props()
  const t = translator(() => locale)
</script>

<div class="waiting" role="status">
  <strong
    >{t('world.waiting.title', { reaction: waiting.reaction })}<InfoTip
      text={t('world.waiting.help')}
    /></strong
  >
  {#if waiting.question}
    <p>{waiting.question.question}</p>
    {#if waiting.question.description}<p class="muted">{waiting.question.description}</p>{/if}
    <div class="choices">
      {#each waiting.question.choices as choice (choice.id)}
        <button class="primary" onclick={() => onanswer(choice.id)}>{choice.name}</button>
        {#if choice.description}<small class="muted">{choice.description}</small>{/if}
      {/each}
    </div>
  {:else}
    {#if waiting.text}<p>{waiting.text}</p>{/if}
    <button class="primary" onclick={() => onanswer()}>{t('world.waiting.goOn')}</button>
  {/if}
</div>

<style>
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--panel-2, transparent);
  }

  p {
    margin: 0;
  }

  .choices {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
