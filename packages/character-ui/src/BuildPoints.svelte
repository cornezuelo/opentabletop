<script lang="ts">
  import {
    buildProblems,
    buildRange,
    buildSpent,
    type BuildProblem,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { sheetText } from './texts'

  /**
   * The points a new character spreads among its sheet's values (`build`), before it's made:
   * each value with one less and one more, the points left, and what's still wrong. `values`
   * holds what's chosen (only the build's values), `problems` whether it's right yet.
   */
  let {
    sheet,
    locale,
    values = $bindable({}),
  }: {
    sheet: Sheet
    locale: string
    values?: Record<string, number>
  } = $props()

  const t = $derived(translator(() => locale))
  const build = $derived(sheet.build)
  const spent = $derived(buildSpent(sheet, values))
  const problems = $derived(buildProblems(sheet, values))
  const nameOf = (id: string) => sheetText(sheet.values[id]?.name, locale) ?? id

  const now = (id: string) => values[id] ?? buildRange(sheet, id).start
  function step(id: string, by: number) {
    values = { ...values, [id]: now(id) + by }
  }

  const lowerText = $derived(
    build?.lower === undefined
      ? t('build.lowerAny')
      : build.lower > 0
        ? t('build.lowerSome', { lower: build.lower })
        : t('build.lowerNone'),
  )

  function problemText(p: BuildProblem): string | undefined {
    if (p.code === 'ABOVE_MAX') return t('build.aboveMax', { name: nameOf(p.value), max: p.max })
    if (p.code === 'BELOW_MIN') return t('build.belowMin', { name: nameOf(p.value), min: p.min })
    if (p.code === 'TOO_MANY_LOWER') return t('build.tooManyLower', { lower: p.lower })
    return undefined
  }
  const said = $derived(problems.map(problemText).filter((s): s is string => !!s))
  const left = $derived((build?.points ?? 0) - spent)
</script>

{#if build}
  <fieldset class="build">
    <legend class="overline">
      {t('build.title', { points: build.points })}<InfoTip
        markdown={[
          t('build.help', { lower: lowerText }),
          sheetText(build.description, locale) ?? '',
        ]
          .filter(Boolean)
          .join('\n')}
      />
      <span class="left" class:done={left === 0} class:over={left < 0}>
        {left > 0
          ? t('build.left', { left })
          : left < 0
            ? t('build.over', { over: -left })
            : t('build.done')}
      </span>
    </legend>
    <ul>
      {#each build.values as id (id)}
        {@const { start, min, max } = buildRange(sheet, id)}
        {@const n = now(id)}
        <li>
          <span class="name">{nameOf(id)}</span>
          <button
            type="button"
            class="step"
            disabled={min !== undefined && n <= min}
            use:tooltip={t('build.less')}
            aria-label={t('build.less')}
            onclick={() => step(id, -1)}>−</button
          >
          <strong class:raised={n > start} class:lowered={n < start}>{n}</strong>
          <button
            type="button"
            class="step"
            disabled={max !== undefined && n >= max}
            use:tooltip={t('build.more')}
            aria-label={t('build.more')}
            onclick={() => step(id, 1)}>+</button
          >
        </li>
      {/each}
    </ul>
    {#each said as line (line)}
      <p class="problem">{line}</p>
    {/each}
  </fieldset>
{/if}

<style>
  .build {
    margin: 0;
    padding: 8px 12px 10px;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  legend {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 0 4px;
  }

  .left {
    color: var(--accent);
    text-transform: none;
    letter-spacing: 0;
  }

  .left.done {
    color: var(--text-muted);
  }

  .left.over {
    color: var(--danger);
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px 16px;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto 2.2em auto;
    gap: 6px;
    align-items: center;
  }

  strong {
    font-size: 16px;
    text-align: center;
  }

  strong.raised {
    color: var(--accent);
  }

  strong.lowered {
    color: var(--danger);
  }

  .step {
    width: 26px;
    height: 26px;
    padding: 0;
  }

  .problem {
    margin: 6px 0 0;
    color: var(--danger);
  }
</style>
