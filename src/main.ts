import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { getLocale } from './lib/i18n/index.svelte'

document.documentElement.lang = getLocale()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
