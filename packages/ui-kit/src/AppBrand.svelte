<script lang="ts">
  import { appIconUrl, type AppId } from './apps'

  /** App icon and name, the same in every app's header. */
  let { app, name, onclick }: { app: AppId; name: string; onclick?: () => void } = $props()
</script>

{#if onclick}
  <button class="brand" {onclick}>
    <img src={appIconUrl(app)} alt="" />
    <span>{name}</span>
  </button>
{:else}
  <span class="brand">
    <img src={appIconUrl(app)} alt="" />
    <span>{name}</span>
  </span>
{/if}

<style>
  .brand {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 0;
    font-family: Georgia, serif;
    font-size: 18px;
    color: var(--text);
    background: none;
    border: none;
  }

  button.brand {
    cursor: pointer;
  }

  img {
    flex: none;
    width: 22px;
    height: 22px;
  }

  span span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
