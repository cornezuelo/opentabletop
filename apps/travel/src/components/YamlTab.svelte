<script lang="ts">
  import { CodeEditor, locate, manifestOf, yamlHints } from '@open-tabletop/pack-ui'
  import { t } from '../lib/i18n'
  import { library } from '../lib/packs.svelte'
  import ReadOnly from './ReadOnly.svelte'

  /** The file with the system's rules and bindings, with problems at their lines. */
  let { root, path }: { root: string; path: string } = $props()

  /** Suggestions while typing: this pack's tables first, then everything the packs use. */
  const hints = $derived(
    yamlHints(
      library.registry,
      manifestOf(library.pack(root) ?? { root, origin: 'user', files: [] }).id,
    ),
  )
  const content = $derived(library.readFile(root, path) ?? '')
  const editable = $derived(library.isEditable(root))
  const problems = $derived(
    library.diagnostics(root, path).map((d) => ({
      line: d.line ?? locate(content, d.at) ?? 1,
      message: d.message,
      severity: d.severity,
    })),
  )
</script>

<div class="yaml">
  <p class="file">{root}/{path}</p>
  {#if !editable}<ReadOnly {root} />{/if}
  <div class="code">
    {#key `${root}/${path}/${editable}`}
      <CodeEditor
        value={content}
        readonly={!editable}
        {problems}
        {hints}
        onchange={(text) => library.writeFile(root, path, text, true)}
      />
    {/key}
  </div>
  {#if problems.length}
    <ul class="problems">
      {#each problems as p, i (i)}<li>{t('yaml.line', { line: p.line })} · {p.message}</li>{/each}
    </ul>
  {/if}
</div>

<style>
  .yaml {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }

  .file {
    margin: 0;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-muted);
  }

  .code {
    flex: 1;
    min-height: 320px;
  }

  .problems {
    margin: 0;
    padding: 0;
    font-size: 12px;
    color: #e3a19f;
    list-style: none;
  }
</style>
