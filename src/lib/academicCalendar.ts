export type AcademicMilestone = {
  labelKey: string
  date: string // ISO YYYY-MM-DD
}

export type AcademicTerm = {
  term: 'FALL' | 'SPRING'
  year: number
  milestones: AcademicMilestone[]
}

// Manually maintained from UGA's official Registrar academic calendar
// (reg.uga.edu/news/calendar/2026-2027/) — same maintenance model already accepted in
// this codebase for gym hours (src/lib/gymHours.ts): there is no feed/webhook for this,
// so it must be re-checked and updated by hand whenever UGA publishes a new calendar
// (typically once per academic year). Last verified against the official page 2026-09-10.
export const ACADEMIC_CALENDAR: AcademicTerm[] = [
  {
    term: 'FALL',
    year: 2026,
    milestones: [
      { labelKey: 'classesBegin', date: '2026-08-17' },
      { labelKey: 'laborDay', date: '2026-09-07' },
      { labelKey: 'fallBreak', date: '2026-10-30' },
      { labelKey: 'thanksgivingBreak', date: '2026-11-23' },
      { labelKey: 'lastDayOfClasses', date: '2026-12-01' },
      { labelKey: 'finalExamsBegin', date: '2026-12-03' },
    ],
  },
  {
    term: 'SPRING',
    year: 2027,
    milestones: [
      { labelKey: 'classesBegin', date: '2027-01-11' },
      { labelKey: 'mlkDay', date: '2027-01-18' },
      { labelKey: 'springBreak', date: '2027-03-08' },
      { labelKey: 'lastDayOfClasses', date: '2027-04-26' },
      { labelKey: 'finalExamsBegin', date: '2027-04-28' },
    ],
  },
]

// Which declared term "covers" a given date (Fall ~ mid-Jul to Dec, Spring ~ Jan to
// early-Jun). Returns undefined outside every declared term (summer, or a future term
// nobody has added here yet) so the UI can hide the reference strip entirely rather than
// show a stale/wrong term — see ai/SPEC.md §5.4 ("never display a stale snapshot as if
// current").
export function currentAcademicTerm(now: Date = new Date()): AcademicTerm | undefined {
  return ACADEMIC_CALENDAR.find((entry) => {
    const start = entry.term === 'FALL' ? new Date(entry.year, 6, 15) : new Date(entry.year, 0, 1)
    const end = entry.term === 'FALL' ? new Date(entry.year, 11, 20) : new Date(entry.year, 5, 1)
    return now >= start && now < end
  })
}

// The next couple of upcoming milestones within the current term, for the Events
// board's small non-interactive reference strip (ai/SPEC.md §5.1).
export function upcomingMilestones(now: Date = new Date(), count = 2): AcademicMilestone[] {
  const term = currentAcademicTerm(now)
  if (!term) return []
  return term.milestones.filter((milestone) => new Date(milestone.date) >= now).slice(0, count)
}
