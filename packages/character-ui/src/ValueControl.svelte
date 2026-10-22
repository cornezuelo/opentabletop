<script lang="ts">
  import { tick } from 'svelte'
  import { ClockDial } from '@open-tabletop/ui-kit'
  import { levelValue, type ValueView } from './display'
  import { translator } from './i18n'

  /**
   * One number of a sheet drawn as the sheet says (`display:`): a number box, the number
   * with its max, a bar, boxes, rating dots, a round dial or a choice of named levels, in
   * the tone of the threshold it has reached. Clicking it asks for a new value (`onset`);
   * the host keeps it within its bounds.
   */
  let {
    view,
    label,
    locale,
    disabled = false,
    onset,
  }: {
    view: ValueView
    /** What it's called, for screen readers. */
    label: string
    locale: string
    disabled?: boolean
    onset: (value: number) => void
  } = $props()

  const t = translator(() => locale)
  const max = $derived(view.max ?? 0)
  /** The boxes or dots, from 1 to its max. */
  const marks = $derived(Array.from({ length: Math.max(0, Math.round(max)) }, (_, i) => i + 1))
  /** Clicking the last filled mark empties it; never under the min. */
  const markTo = (mark: number) => Math.max(view.min ?? 0, mark === view.value ? mark - 1 : mark)
  const step = (by: number) => onset(view.value + by)
  /**
   * A number typed in: asked for, then the box shows what the value really is (typing 9
   * where the max is 6 leaves 6; the value didn't change, so nothing would redraw it).
   */
  async function typed(e: Event & { currentTarget: HTMLInputElement }) {
    const input = e.currentTarget
    onset(Number(input.value) || 0)
    await tick()
    input.value = String(view.value)
  }
  /** A click on a bar: the value at that point of it. */
  function barAt(e: MouseEvent) {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const from = Math.min(view.min ?? 0, 0)
    onset(Math.round(from + ((e.clientX - box.left) / box.width) * (max - from)))
  }
</script>

<div class="control {view.display}" class:toned={!!view.tone} data-tone={view.tone}>
  {#if view.display === 'of'}
    <span class="of">
      <input
        type="number"
        step="any"
        aria-label={label}
        min={view.min}
        max={view.max}
        value={view.value}
        {disabled}
        onchange={typed}
      />
      <span class="max">/ {view.max}</span>
    </span>
  {:else if view.display === 'bar'}
    <span class="bar-row">
      {#if !disabled}<button
          type="button"
          class="step"
          aria-label={t('less', { name: label })}
          onclick={() => step(-1)}>−</button
        >{/if}
      <button
        type="button"
        class="bar"
        aria-label={`${label}: ${view.value} / ${view.max}`}
        {disabled}
        onclick={barAt}
      >
        <span class="fill" style:width="{(view.fill ?? 0) * 100}%"></span>
        <span class="count">{view.value} / {view.max}</span>
      </button>
      {#if !disabled}<button
          type="button"
          class="step"
          aria-label={t('more', { name: label })}
          onclick={() => step(1)}>+</button
        >{/if}
    </span>
  {:else if view.display === 'boxes' || view.display === 'pips'}
    <div class="marks" role="group" aria-label={label}>
      {#each marks as mark (mark)}
        <button
          type="button"
          class:on={mark <= view.value}
          aria-label={t('box', { value: mark, max })}
          aria-pressed={mark <= view.value}
          {disabled}
          onclick={() => onset(markTo(mark))}
        ></button>
      {/each}
    </div>
  {:else if view.display === 'dial'}
    <span class="dial-row">
      <ClockDial
        segments={max}
        filled={view.value}
        size={40}
        {label}
        onfill={disabled ? undefined : (n) => onset(Math.max(view.min ?? 0, n))}
      />
      <span class="count">{view.value} / {view.max}</span>
    </span>
  {:else if view.display === 'levels' && view.levels}
    <select
      aria-label={label}
      value={view.level === undefined ? '' : String(view.level)}
      {disabled}
      onchange={(e) => onset(levelValue(Number(e.currentTarget.value), view.min))}
    >
      {#if view.level === undefined}<option value="">{view.value}</option>{/if}
      {#each view.levels as level, i (level.id)}
        <option value={String(i)}>{level.name}</option>
      {/each}
    </select>
  {:else}
    <input
      type="number"
      step="any"
      aria-label={label}
      min={view.min}
      max={view.max}
      value={view.value}
      {disabled}
      onchange={typed}
    />
  {/if}
</div>

<style>
  /* A tone is the theme's colour for it, put in place of the accent (dials take it too). */
  .control[data-tone='good'] {
    --accent: var(--good);
  }

  .control[data-tone='warning'] {
    --accent: var(--warning);
  }

  .control[data-tone='danger'] {
    --accent: var(--danger);
  }

  .toned input,
  .toned select,
  .toned .count {
    color: var(--accent);
  }

  input,
  select {
    width: 100%;
    min-width: 0;
  }

  .of,
  .bar-row,
  .dial-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .of input {
    width: 4em;
  }

  .max,
  .count {
    color: var(--text-muted);
    white-space: nowrap;
  }

  .bar {
    position: relative;
    flex: 1;
    height: 18px;
    padding: 0;
    overflow: hidden;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 9px;
    cursor: pointer;
  }

  /* Its tone on the frame too, so an empty bar still shows it. */
  .toned .bar {
    border-color: var(--accent);
  }

  .bar:disabled {
    cursor: default;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--accent);
    transition: width 0.12s;
  }

  .bar .count {
    position: relative;
    font-size: 11px;
    color: var(--text);
    text-shadow: 0 0 3px var(--bg);
  }

  .step {
    padding: 0 6px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .marks {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .marks button {
    width: 16px;
    height: 16px;
    padding: 0;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 3px;
    cursor: pointer;
  }

  .pips .marks button {
    border-radius: 50%;
  }

  .marks button.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  .marks button:disabled {
    cursor: default;
  }
</style>
