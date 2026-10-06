<script lang="ts">
  import { t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { locate } from '@open-tabletop/pack-ui/yaml'
  import { CodeEditor } from '@open-tabletop/pack-ui'
  import ReadOnlyNotice from './ReadOnlyNotice.svelte'

  let { root, path, line }: { root: string; path: string; line?: number } = $props()

  const content = $derived(workspace.readFile(root, path) ?? '')
  const editable = $derived(workspace.isEditable(root))
  const diagnostics = $derived(workspace.diagnostics(root, path))
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
    <button class="link" onclick={() => go({ name: 'pack', root })}>{root}</button>
    <span>/</span>
    <strong>{path}</strong>
    <span class="status" class:bad={problems.length > 0}>
      {problems.length ? t('file.problems', { count: problems.length }) : t('file.noProblems')}
    </span>
  </header>
  {#if !editable}
    <ReadOnlyNotice {root} />
  {/if}
  <div class="code">
    {#key `${root}/${path}/${editable}`}
      <CodeEditor
        value={content}
        readonly={!editable}
        {problems}
        line={jump}
        onchange={(text) => workspace.writeFile(root, path, text)}
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
    padding: 0;
    overflow: auto;
    font-size: 12px;
    list-style: none;
  }

  .problems li {
    padding: 3px 0;
    border-bottom: 1px solid var(--panel-border);
  }

  .problems li.error {
    color: #e3a19f;
  }

  .problems li.warning {
    color: #d8c58a;
  }
</style>
