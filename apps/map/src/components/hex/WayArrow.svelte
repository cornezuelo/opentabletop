<script lang="ts">
  /** A way's badge beside its name: into a sub-map, or out to the map above. */
  let { dir }: { dir: 'in' | 'out' } = $props()
</script>

<span class="arrow {dir}">{dir === 'in' ? '↓' : '↑'}</span>

<style>
  .arrow {
    display: inline-block;
    flex: none;
    width: 16px;
    height: 16px;
    margin-right: 2px;
    border-radius: 50%;
    font-size: 11px;
    line-height: 16px;
    color: #f4efe2;
    text-align: center;
  }

  /* The colours of the ways' badges on the map. */
  .arrow.in {
    background: #c4561c;
  }

  .arrow.out {
    background: #1f7a8c;
  }
</style>
