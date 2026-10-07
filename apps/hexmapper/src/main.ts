import { offerUpdate } from '@open-tabletop/ui-kit'
import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import './app.css'
import App from './App.svelte'
import { getLocale } from './lib/i18n/index.svelte'

document.documentElement.lang = getLocale()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

// A new version downloaded for offline use: offer to reload into it.
const updateSW = registerSW({ onNeedRefresh: () => void offerUpdate(() => updateSW(true)) })
