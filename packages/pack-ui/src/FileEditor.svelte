<script lang="ts">
  import CodeEditor from './CodeEditor.svelte'
  import { yamlHints } from './completion'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import { manifestOf } from './packs'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'
  import { locate } from './yaml'

  /** A file of a pack as YAML, with its problems beside it. */
  let {
    library,
    locale,
    root,
    path,
    line,
    onpack,
  }: {
    library: PackLibrary
    locale: string
    root: string
    path: string
    line?: number
    /** Go to a pack, by its folder (this one's, or a duplicate of it). */
    onpack: (root: string) => void
  } = $props()
  const t = translator(() => locale)

  /** Suggestions while typing: this pack's tables first, then everything the packs use. */
  const hints = $derived(
    yamlHints(
      library.registry,
      manifestOf(library.pack(root) ?? { root, origin: 'user', files: [] }).id,
    ),
  )
  const content = $derived(library.readFile(root, path) ?? '')
  const editable = $derived(library.isEditable(root))
  const diagnostics = $derived(library.diagnostics(root, path))
  const problems = $derived(
    diagnostics.map((d) => ({
      line: d.line ?? locate(content, d.at) ?? 1,
      message: d.at ? `${d.at}: ${d.message}` : d.message,
      severity: d.severity,
    })),
  )
  // Follows the requested line, and can be moved by clicking a problem.
  let jump = $derived<number | undefined>(line)
</script>

<section class="file">
  <header>
    <button class="link" onclick={() => onpack(root)}>{root}</button>
    <span>/</span>
    <strong>{path}</strong>
    <span class="status" class:bad={problems.length > 0}>
      {problems.length ? t('file.problems', { count: problems.length }) : t('file.noProblems')}
    </span>
  </header>
  {#if !editable}
    <ReadOnlyNotice {library} {locale} {root} onmade={onpack} />
  {/if}
  <div class="code">
    {#key `${root}/${path}/${editable}`}
      <CodeEditor
        value={content}
        readonly={!editable}
        {problems}
        {hints}
        line={jump}
        onchange={(text) => library.writeFile(root, path, text, true)}
      />
    {/key}
  </div>
  {#if problems.length}
    <ul class="problems">
      {#each problems as problem, i (i)}
        <li class={problem.severity}>
          <button class="link" onclick={() => (jump = problem.line)}
            >{t('file.line', { line: problem.line })}</button
          >
          {problem.message}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .file {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }

  header {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .status {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  .status.bad {
    color: var(--danger);
  }

  .code {
    flex: 1;
    min-height: 240px;
  }

  .problems {
    max-height: 30%;
    margin: 0;
    padding: 0 var(--scroll-room) 0 0;
    overflow: auto;
    font-size: 12px;
    list-style: none;
  }

  .problems li {
    padding: 3px 0;
    border-bottom: 1px solid var(--panel-border);
  }

  .problems li.error {
    color: var(--danger-text);
  }

  .problems li.warning {
    color: var(--warning-text);
  }
</style>
