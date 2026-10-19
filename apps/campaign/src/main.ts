import '@open-tabletop/ui-kit/theme.css'
import { offerUpdate } from '@open-tabletop/ui-kit'
import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import App from './App.svelte'
import './app.css'
import { getLocale } from './lib/i18n'

document.documentElement.lang = getLocale()

export default mount(App, { target: document.getElementById('app')! })

// A new version downloaded for offline use: offer to reload into it.
const updateSW = registerSW({ onNeedRefresh: () => void offerUpdate(() => updateSW(true)) })
