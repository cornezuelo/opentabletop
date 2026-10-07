export const en = {
  updates: {
    title: 'The bundled version of this pack has changed since you made your copy.',
    versions: 'Bundled: {bundled} · your copy: {mine}.',
    untracked:
      'Your copy was made before OpenTabletop kept track of updates: these files differ from the bundled version (by your edits or by updates; it can’t be told which). Choose for each one; from now on you’ll be told what changes.',
    added: 'new in the bundled pack',
    changed: 'changed in the bundled pack; you haven’t touched it',
    removed: 'removed from the bundled pack',
    both: 'changed in the bundled pack and in your copy',
    differs: 'differs from the bundled version',
    take: 'Take bundled',
    keep: 'Keep mine',
    takeHelp:
      'Replace your version of this file with the bundled one (a file the bundled pack removed is removed). ↶ undoes it.',
    keepHelp: 'Keep your version of this file and stop being told about this update.',
    takeUntouched: 'Take the updates you haven’t touched ({count})',
    takeUntouchedHelp:
      'Bring in every file the bundled pack changed that your copy left as it was: nothing of yours is lost. ↶ undoes it.',
    keepAll: 'Keep my copy as it is',
    keepAllHelp:
      'Ignore these updates: your copy stays as it is and these changes stop being shown. Revert to bundled still gets the whole bundled pack.',
    show: 'See the bundled version',
    hide: 'Hide',
  },
} as const
