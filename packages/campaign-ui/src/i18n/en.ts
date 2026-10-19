import { vocabulary } from '@open-tabletop/ui-kit'

export const en = {
  whatItDoes: 'What it does',
  world: {
    clockIdTip:
      'How tables and conditions read this clock: world.clocks.{id} (its name in lowercase with dashes)',
    weatherLine: 'Weather: {weather}',
    weatherHelp:
      "Today's weather. With a trip going on, the trip's (its weather check); without one, the world clock's own: each day that passes is rolled on the campaign system's weather model, following the day before's. Hand rolls read it as `weather`.",
    intro:
      'The world clock keeps the campaign’s date, shared by its maps and trips: move time on, schedule events that come due on their day, and keep progress clocks (“The comet falls: 3/6”).',
    start: 'Start the world clock',
    stop: 'Stop the world clock',
    confirmStop: 'Stop the world clock? Its date, events, clocks and timeline are forgotten.',
    dayLine: 'Day {day} · {clock} · {season}',
    day: 'Day {day}',
    date: '{weekday}, {day} {month}, year {year}',
    seasons: vocabulary.en.seasons,
    moon: vocabulary.en.moonPhases,
    moonLine: '{moon} is {phase}',
    advance: 'Move time on',
    advanceHelp:
      "Moves the world's time on. Events that come due on the way are written in the timeline (and, during a trip, in its journal), with holidays and full and new moons.\n• **Next: Watches** — to when the next part of a division of the day begins (the calendar's: meals, watches… each system its own)\n• **Until…** — to when the part chosen next begins\n• **Next day** — to when the next day starts, at midnight\n• **Next event** — straight to the next scheduled event",
    tripHelp:
      'A trip is going on without a route, so these buttons make the party wait at {hex} (plan a route and they travel on along it). Every moment is lived (the checks of each moment the system names, its halt when the party can’t march, the end of each day, eating), and the wait stops early if something needs you.',
    tripAdvance: 'Wait here',
    tripAdvanceTravel: 'Travel on',
    tripNotice: 'A trip is going on with no route: the party waits at {hex}.',
    tripNoticeTravel: 'A trip is going on: the party travels on towards {hex}.',
    tripHelpTravel:
      'A trip is going on with a route planned, so these buttons make the party travel on towards {hex}: it marches along its route when the system lets it, does the system’s halt when it can’t (camp, or the time passes without it), and waits where the route ends. Every moment is lived (the checks of each moment the system names, the end of each day, eating), and it stops early if something needs you.',
    hour: '+1 hour',
    watches: vocabulary.en.terms.watches,
    nextPart: 'Next: {division}',
    untilPart: 'Until…',
    untilPartGo: 'Go',
    nextDay: 'Next day',
    nextEvent: 'Next event',
    events: 'Events',
    eventsHelp:
      "Things that happen on a date: a festival, an attack, a ship arriving. They come due when time reaches them, in the timeline and the trip's journal; repeating ones come back.\n• _The Salt Lords attack_ in 3 days\n• _Market day_ every 7 days",
    noEvents: 'Nothing scheduled.',
    eventName: 'What happens',
    inDays: 'In days',
    at: 'at',
    repeat: 'Repeat',
    once: 'Once',
    everyN: 'Every N days',
    everyDays: 'every {days} days',
    yearly: 'every year',
    schedule: 'Schedule',
    cancel: 'Cancel this event',
    confirmCancel: 'Cancel “{name}”?',
    clocks: 'Progress clocks',
    clocksHelp:
      "Segments filled as something advances (a threat, a project, a faction's plan):\n• _The comet falls_ 2/6\n• _The bridge is rebuilt_ 1/4\nClick a segment to fill up to it; click the last filled one to empty it. Any number of segments: change it beside the count.\nThe campaign's system may declare its own (`kind: clocks`): they come with the world clock, and do what the system says when they fill (a line here, a table rolled, other clocks and factions changed, starting over).",
    clockName: 'Clock name',
    segments: 'Segments',
    addClock: 'Add',
    removeClock: 'Remove this clock',
    confirmRemoveClock: 'Remove the clock “{name}”?',
    clockFilled: vocabulary.en.world.clockFilled,
    systemClocks: "Add the system's clocks ({count})",
    systemClocksHelp:
      "The progress clocks the campaign's system declares (`kind: clocks` in its pack), each with its segments, where it starts and what happens when it fills. They come with the world clock when it starts; this adds the ones it doesn't have yet (taken off, or declared later).",
    declaredClock:
      "Declared by the system: tables and conditions also read it as world.clocks.{id}, whatever it's called here.",
    whenFull: 'When it fills: {what}',
    fullRolls: 'rolls {table}',
    fullEffects: 'changes {effects}',
    fullThen: {
      keep: 'stays full',
      reset: 'starts over',
      remove: 'goes away',
    },
    timeline: 'Timeline',
    timelineHelp:
      'What happened in the world, newest first: events that came due, holidays, moons. Add your own notes ("The baron was overthrown").',
    noTimeline: 'Nothing yet.',
    note: 'A note for the timeline',
    addNote: 'Add',
    startAt: 'Starting on',
    startAtHelp:
      "The date the world clock starts at, in the calendar of the campaign's system: day, month, year and time (with the default calendar, the day number and time).\n• **15 Brightmonth 412, 06:00** — a start at midsummer\nWith a trip going on, the clock starts at the trip's time (they share one time).",
    startAtTrip: 'A trip is going on: the clock starts at its time.',
    setDate: 'Set the date',
    setDateHelp:
      "Moves the world clock to a date.\n• **Later**: like moving time on (with a trip going on the party travels or waits until then, and you're asked before days pass); events, holidays and moons on the way come due.\n• **Earlier**: asked first, and only without a trip going on. Nothing that happened is undone: the timeline keeps it and says the clock went back.",
    setDateGo: 'Go to this date',
    setDateCancel: 'Cancel',
    confirmRewind:
      'Put the clock back to this date? What happened stays in the timeline; repeating events don’t come back.',
    noRewindTrip:
      'The clock can’t go back while a trip is going on: a trip’s time never goes back.',
    rewound: 'The clock went back (from {from})',
    dateDay: 'Day of the month',
    dateMonth: 'Month',
    dateYear: 'Year',
    dateDayNumber: 'Day',
    dateMissing: 'The calendar has no such date (or it’s before the first day).',
    eventId: 'Id',
    eventIdHelp:
      "How conditions and tables name the event on its day: `world.events: <id>`. Lowercase words joined by dashes, one per event.\n• `market-day` — `when: { world.events: market-day }`\n• `clan-raid`\nEmpty: its name written that way (**Market day** → `market-day`; a number is added if it's taken). Its name works too, as an id.",
    eventIdBad: 'An id is lowercase words joined by dashes: market-day.',
    eventIdTaken: 'Taken: a number will be added to it.',
    eventDescription: 'Description (optional)',
    when: 'When',
    onDate: 'On a date',
    onDatePast: 'That date has passed.',
  },
  factions: {
    title: 'Factions',
    help: "The factions of the campaign's system (`kind: factions` in its pack): each with its colour, its sheet (its values, conditions and relations, like a character's), kept by the campaign, and the hexes it holds on each of its maps. On a **world turn** each one rolls its turn table, and what comes up changes them, their land on the map it's played on and the world clock's progress clocks; the timeline says what each did. Tables and conditions read them everywhere:\n• `factions.the-vale.values.strength: { gte: 3 }`\n• `hex.faction: iron-clans` — who holds the hex\n• `factions.iron-clans.territory: { gt: 10 }` — how many hexes it holds on the map being played",
    bring: 'Bring in its factions',
    territory: '{n} hexes',
    territoryOne: '1 hex',
    turn: 'World turn',
    turnHelp:
      'Every faction takes its turn now, in order, each seeing what the ones before it did: it rolls its table and applies what comes up (its values, another faction’s, its land on the map being played growing or shrinking hex by hex, the world clock’s progress clocks). Each result goes to the timeline.',
    auto: 'Turns by themselves, every {days} days',
    autoHelp:
      'As the world clock moves on (by hand, or with a trip), a world turn comes every so many days, as the system says. Untick to take them only with **World turn**.',
  },
}
