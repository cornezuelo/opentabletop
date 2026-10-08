<script lang="ts">
  import { Manual } from '@open-tabletop/manual-ui'
  import { Dialogs, initialLocale, Toasts } from '@open-tabletop/ui-kit'

  /** The language every app shares: the user's choice, else the browser's, else English. */
  const KEY = 'opentabletop.locale'
  const locales = { en: 'English', es: 'Español' }
  let locale = $state(initialLocale([KEY], Object.keys(locales), 'en'))
  $effect(() => {
    document.documentElement.lang = locale
  })

  function setLocale(next: string) {
    locale = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not remembered; it still applies now.
    }
  }
</script>

<Manual {locale} {locales} onlocale={setLocale} />
<Toasts />
<Dialogs />
