// First: brings data kept by older versions up to date before anything reads it.
import '@open-tabletop/storage/start'
import { offerUpdate } from '@open-tabletop/ui-kit'
import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import '@open-tabletop/ui-kit/theme.css'
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
