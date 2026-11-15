<script lang="ts">
  import { initialsOf } from './texts'

  /**
   * Someone's face where there's little room (a fight's card, a token in an order): their
   * initial in a disc, a copy's number kept (`Bandit 2` → `B2`). Its colour is the host's
   * (`--face`, the accent when unsaid) and its size its font's (`font-size`). Drawn, not said:
   * whatever holds it names who it is.
   */
  let { name }: { name: string } = $props()
</script>

<span class="face" aria-hidden="true">{initialsOf(name)}</span>

<style>
  .face {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 2.2em;
    height: 2.2em;
    font-size: inherit;
    font-weight: 700;
    line-height: 1;
    color: var(--face, var(--accent));
    letter-spacing: -0.02em;
    background: color-mix(in srgb, var(--face, var(--accent)) 16%, var(--panel));
    border: 1px solid color-mix(in srgb, var(--face, var(--accent)) 60%, transparent);
    border-radius: 50%;
  }
</style>
