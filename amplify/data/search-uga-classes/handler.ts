import type { AppSyncResolverHandler } from 'aws-lambda'

// Source: the CSV files reg.uga.edu's own "Schedule of Classes" page fetches
// client-side (via PapaParse) to render its search widget — apps.reg.uga.edu
// doesn't send CORS headers, so we fetch it here instead of from the browser.
const SOC_CSV_URLS: Record<string, string> = {
  fall: 'https://apps.reg.uga.edu/soc/fall.csv',
  spring: 'https://apps.reg.uga.edu/soc/spring.csv',
  summer: 'https://apps.reg.uga.edu/soc/summer.csv',
}

// Some large gen-ed courses (e.g. ENGL1102, POLS1101, FYOS1001) have hundreds of
// sections/meeting-rows even for one exact course code — this needs to be high
// enough that an exact course-code search never gets silently truncated. Also
// doubles as the cap on the default "browse everything" view (empty query,
// no filters) — matches are sorted by course code first, so that view is
// consistently the first MAX_RESULTS courses alphabetically, not an arbitrary
// CSV-order slice.
const MAX_RESULTS = 500

// The CSV is ~7-8MB / ~20k rows and identical for every query in a given term,
// so re-fetching and re-parsing it per search is pure waste — cache the parsed
// rows in module scope, keyed by term, and reuse them across invocations that
// land on the same still-warm Lambda container. Only lasts as long as the
// container does (cold starts / concurrent containers still get a fresh copy),
// but that's enough to eliminate the repeat cost during a burst of searches.
const CACHE_TTL_MS = 15 * 60 * 1000
let csvCache: { term: string; rows: string[][]; fetchedAt: number } | null = null

function defaultTerm(): string {
  const month = new Date().getUTCMonth() + 1
  if (month >= 8) return 'fall'
  if (month >= 6) return 'summer'
  return 'spring'
}

function resolveTerm(term?: string | null): string {
  return term && SOC_CSV_URLS[term] ? term : defaultTerm()
}

// Minimal RFC4180 parser (quoted fields, doubled-quote escaping) — the CSV has
// commas inside quoted fields (e.g. course titles), so a plain split(',') won't work.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\r') {
      continue
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

async function getRows(term: string): Promise<string[][]> {
  if (csvCache && csvCache.term === term && Date.now() - csvCache.fetchedAt < CACHE_TTL_MS) {
    return csvCache.rows
  }

  const response = await fetch(SOC_CSV_URLS[term])
  if (!response.ok) {
    throw new Error(`UGA schedule-of-classes request failed with status ${response.status}`)
  }
  const csvText = await response.text()
  const rows = parseCsv(csvText)

  csvCache = { term, rows, fetchedAt: Date.now() }
  return rows
}

function columnIndexer(header: string[]) {
  const columnIndex = new Map(header.map((name, index) => [name, index]))
  return (name: string) => columnIndex.get(name) ?? -1
}

type Args = {
  query?: string | null
  term?: string | null
  subject?: string | null
  level?: string | null
}

type Meeting = {
  crn: string
  courseCode: string
  title: string
  section: string
  scheduleType: string
  instructor: string
  instructorFirstName: string
  instructorLastName: string
  days: string[]
  startTime: string
  endTime: string
  building: string
  room: string
}

// "CSCI 1301" -> ['CSCI', 1301], compared subject-then-number so course
// numbers sort correctly regardless of digit count (e.g. "99" vs "100").
function compareCourseCode(a: string, b: string): number {
  const [subjectA, numberA] = a.split(/\s+/)
  const [subjectB, numberB] = b.split(/\s+/)
  if (subjectA !== subjectB) return subjectA.localeCompare(subjectB)
  return (parseInt(numberA, 10) || 0) - (parseInt(numberB, 10) || 0)
}

// Buckets course numbers into UGA's conventional level tiers: '1'..'4' for
// 1000s-4000s, '5' for everything 5000 and up (grad/professional/dual-listed).
function courseLevelBucket(courseNumber: string): string {
  const num = parseInt(courseNumber, 10)
  if (!Number.isFinite(num) || num <= 0) return ''
  return String(Math.min(Math.floor(num / 1000), 5))
}

const DAY_COLUMNS: { column: string; code: string }[] = [
  { column: 'MEETING_TIME.MONDAY_IND', code: 'MON' },
  { column: 'MEETING_TIME.TUESDAY_IND', code: 'TUE' },
  { column: 'MEETING_TIME.WEDNESDAY_IND', code: 'WED' },
  { column: 'MEETING_TIME.THURSDAY_IND', code: 'THU' },
  { column: 'MEETING_TIME.FRIDAY_IND', code: 'FRI' },
  { column: 'MEETING_TIME.SATURDAY_IND', code: 'SAT' },
  { column: 'MEETING_TIME.SUNDAY_IND', code: 'SUN' },
]

function to24Hour(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2]
  const period = match[3].toLowerCase()

  if (period === 'am') {
    if (hour === 12) hour = 0
  } else if (hour !== 12) {
    hour += 12
  }

  return `${String(hour).padStart(2, '0')}:${minute}`
}

function parseTimeRange(raw: string): { startTime: string; endTime: string } | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toUpperCase() === 'TBA') return null

  const parts = trimmed.split('-')
  if (parts.length !== 2) return null

  const startTime = to24Hour(parts[0])
  const endTime = to24Hour(parts[1])
  if (!startTime || !endTime) return null

  return { startTime, endTime }
}

export const handler: AppSyncResolverHandler<Args, Meeting[]> = async (event) => {
  const term = resolveTerm(event.arguments.term)
  const rows = await getRows(term)
  if (rows.length < 2) return []

  const header = rows[0]
  const col = columnIndexer(header)

  const statusIdx = col('SCHEDULE_OFFERING.STATUS')
  const subjectIdx = col('SCHEDULE_OFFERING.SUBJECT')
  const courseNumberIdx = col('SCHEDULE_OFFERING.COURSE_NUMBER')
  const titleIdx = col('SCHEDULE_OFFERING.TITLE_LONG_DESC')
  const sectionIdx = col('MEETING_TIME.SECTION')
  const crnIdx = col('SCHEDULE_OFFERING.COURSE_REFERENCE_NUMBER')
  const timeIdx = col('Time')
  const buildingDescIdx = col('MEETING_TIME.BUILDING_DESC')
  const roomIdx = col('Room')
  const firstNameIdx = col('SCHEDULE_OFFERING.PRIMARY_INSTRUCTOR_FIRST_NAME')
  const lastNameIdx = col('SCHEDULE_OFFERING.PRIMARY_INSTRUCTOR_LAST_NAME')
  const scheduleDescIdx = col('SCHEDULE_OFFERING.SCHEDULE_DESC')

  const queryUpper = (event.arguments.query ?? '').trim().toUpperCase()
  const queryCompact = queryUpper.replace(/\s+/g, '')
  const subjectFilter = (event.arguments.subject ?? '').trim().toUpperCase()
  const levelFilter = (event.arguments.level ?? '').trim()

  const matched: Meeting[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < header.length) continue
    if (row[statusIdx] !== 'A') continue

    const subject = row[subjectIdx] ?? ''
    const courseNumber = row[courseNumberIdx] ?? ''
    const title = row[titleIdx] ?? ''
    const subjectCourseCompact = `${subject}${courseNumber}`.toUpperCase()

    // Empty query matches everything — that's the "browse all classes" mode.
    const queryMatches =
      !queryCompact ||
      subjectCourseCompact.startsWith(queryCompact) ||
      subject.toUpperCase() === queryUpper ||
      title.toUpperCase().includes(queryUpper)
    if (!queryMatches) continue
    if (subjectFilter && subject.toUpperCase() !== subjectFilter) continue
    if (levelFilter && courseLevelBucket(courseNumber) !== levelFilter) continue

    const timeRange = parseTimeRange(row[timeIdx] ?? '')
    if (!timeRange) continue

    const days = DAY_COLUMNS.filter(({ column }) => row[col(column)]?.trim()).map(({ code }) => code)
    if (days.length === 0) continue

    const firstName = row[firstNameIdx] ?? ''
    const lastName = row[lastNameIdx] ?? ''

    matched.push({
      crn: row[crnIdx] ?? '',
      courseCode: `${subject} ${courseNumber}`.trim(),
      title,
      section: row[sectionIdx] ?? '',
      scheduleType: row[scheduleDescIdx] ?? '',
      instructor: [firstName, lastName].filter(Boolean).join(' '),
      instructorFirstName: firstName,
      instructorLastName: lastName,
      days,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      building: row[buildingDescIdx] ?? '',
      room: row[roomIdx] ?? '',
    })
  }

  matched.sort((a, b) => compareCourseCode(a.courseCode, b.courseCode))
  return matched.slice(0, MAX_RESULTS)
}
