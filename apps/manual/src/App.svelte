<script lang="ts">
  import { Manual } from '@open-tabletop/manual-ui'

  /** Same language preference as the Oracle app (English by default). */
  const KEY = 'opentabletop.locale'
  const locales = { en: 'English', es: 'Español' }
  const read = () => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored && stored in locales ? stored : 'en'
    } catch {
      return 'en'
    }
  }
  let locale = $state(read())
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
