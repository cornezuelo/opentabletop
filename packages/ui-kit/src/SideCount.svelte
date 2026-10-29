<script lang="ts">
  import { tooltip } from './tooltip'

  /** How many problems a list entry has: a red badge after its name. */
  let { count, tip }: { count: number; tip?: string } = $props()
</script>

<span class="count" use:tooltip={tip}>{count}</span>

<style>
  .count {
    flex: none;
    min-width: 16px;
    padding: 0 4px;
    font-size: 11px;
    color: white;
    text-align: center;
    background: var(--danger);
    border-radius: 8px;
  }
</style>
