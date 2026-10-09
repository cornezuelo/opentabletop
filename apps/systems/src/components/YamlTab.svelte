<script lang="ts">
  import { CodeEditor, locate, manifestOf, yamlHints } from '@open-tabletop/pack-ui'
  import { t } from '../lib/i18n'
  import { library } from '../lib/packs.svelte'

  /** The files of the system's parts (one at a time), with problems at their lines. */
  let { files }: { files: { root: string; path: string }[] } = $props()

  /** The first file with an error, so the problems button lands on it. */
  let chosen = $state(
    Math.max(
      0,
      files.findIndex((f) =>
        library.diagnostics(f.root, f.path).some((d) => d.severity === 'error'),
      ),
    ),
  )
  const root = $derived(files[Math.min(chosen, files.length - 1)].root)
  const path = $derived(files[Math.min(chosen, files.length - 1)].path)

  /** Suggestions while typing: this pack's tables first, then everything the packs use. */
  const hints = $derived(
    yamlHints(
      library.registry,
      manifestOf(library.pack(root) ?? { root, origin: 'user', files: [] }).id,
    ),
  )
  /** A file's name on its tab; with its pack when another pack has a file of that name. */
  const label = (f: { root: string; path: string }) =>
    files.filter((g) => g.path === f.path).length > 1 ? `${f.root}/${f.path}` : f.path
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
  {#if files.length > 1}
    <div class="files" role="tablist">
      {#each files as f, i (`${f.root}/${f.path}`)}
        <button
          role="tab"
          aria-selected={i === chosen}
          class:active={i === chosen}
          onclick={() => (chosen = i)}>{label(f)}</button
        >
      {/each}
    </div>
  {/if}
  <p class="file">{root}/{path}</p>
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

  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .files button {
    padding: 3px 10px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .files button.active {
    color: var(--text);
    border-color: var(--accent);
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
