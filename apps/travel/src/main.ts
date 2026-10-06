import '@open-tabletop/ui-kit/theme.css'
import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import { getLocale } from './lib/i18n'

document.documentElement.lang = getLocale()

export default mount(App, { target: document.getElementById('app')! })
