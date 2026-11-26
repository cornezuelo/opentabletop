<script lang="ts" module>
  /**
   * The interface's own small icons, drawn in lines in the text's colour, for actions whose
   * picture says what they do (an eye reads, a pencil writes); never instead of a word that
   * an icon wouldn't say. Name them with `use:tooltip` and `aria-label` on their button.
   */
  export const ICONS = {
    /** Reading: an eye. */
    read: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    /** Writing: a pencil. */
    edit: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    /** Writing one more here: a pencil and a plus. */
    write:
      '<path d="M3 21h3.5l9-9-3.5-3.5-9 9z"/><path d="m11 10 3.5 3.5"/><path d="M18 3v6M15 6h6"/>',
    /** A page of notes. */
    page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    /** Linking: two links of a chain. */
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    /** Saving a file: an arrow down onto a line. */
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    /** Stopping what goes on: a square. */
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/>',
  } as const

  export type IconName = keyof typeof ICONS
</script>

<script lang="ts">
  let { name }: { name: IconName } = $props()
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- the bundled paths above only -->
<svg viewBox="0 0 24 24" aria-hidden="true">{@html ICONS[name]}</svg>

<style>
  svg {
    flex: none;
    width: 1.15em;
    height: 1.15em;
    vertical-align: -0.2em;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
