/** Dialogs opened from anywhere in the app (rendered once by App). */
export const dialogs = $state<{ newDefinition: { root?: string } | null }>({
  newDefinition: null,
})
