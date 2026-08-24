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
// enough that an exact course-code search never gets silently truncated.
const MAX_RESULTS = 500

type Args = {
  query: string
  term?: string | null
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

function defaultTerm(): string {
  const month = new Date().getUTCMonth() + 1
  if (month >= 8) return 'fall'
  if (month >= 6) return 'summer'
  return 'spring'
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
  const query = (event.arguments.query ?? '').trim()
  if (!query) return []

  const term = event.arguments.term && SOC_CSV_URLS[event.arguments.term] ? event.arguments.term : defaultTerm()
  const url = SOC_CSV_URLS[term]

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`UGA schedule-of-classes request failed with status ${response.status}`)
  }
  const csvText = await response.text()

  const rows = parseCsv(csvText)
  if (rows.length < 2) return []

  const header = rows[0]
  const columnIndex = new Map(header.map((name, index) => [name, index]))
  const col = (name: string) => columnIndex.get(name) ?? -1

  const subjectIdx = col('SCHEDULE_OFFERING.SUBJECT')
  const courseNumberIdx = col('SCHEDULE_OFFERING.COURSE_NUMBER')
  const titleIdx = col('SCHEDULE_OFFERING.TITLE_LONG_DESC')
  const statusIdx = col('SCHEDULE_OFFERING.STATUS')
  const sectionIdx = col('MEETING_TIME.SECTION')
  const crnIdx = col('SCHEDULE_OFFERING.COURSE_REFERENCE_NUMBER')
  const timeIdx = col('Time')
  const buildingDescIdx = col('MEETING_TIME.BUILDING_DESC')
  const roomIdx = col('Room')
  const firstNameIdx = col('SCHEDULE_OFFERING.PRIMARY_INSTRUCTOR_FIRST_NAME')
  const lastNameIdx = col('SCHEDULE_OFFERING.PRIMARY_INSTRUCTOR_LAST_NAME')
  const scheduleDescIdx = col('SCHEDULE_OFFERING.SCHEDULE_DESC')

  const queryUpper = query.toUpperCase()
  const queryCompact = queryUpper.replace(/\s+/g, '')

  const results: Meeting[] = []

  for (let i = 1; i < rows.length && results.length < MAX_RESULTS; i++) {
    const row = rows[i]
    if (row.length < header.length) continue
    if (row[statusIdx] !== 'A') continue

    const subject = row[subjectIdx] ?? ''
    const courseNumber = row[courseNumberIdx] ?? ''
    const title = row[titleIdx] ?? ''
    const subjectCourseCompact = `${subject}${courseNumber}`.toUpperCase()

    const matches =
      subjectCourseCompact.startsWith(queryCompact) ||
      subject.toUpperCase() === queryUpper ||
      title.toUpperCase().includes(queryUpper)
    if (!matches) continue

    const timeRange = parseTimeRange(row[timeIdx] ?? '')
    if (!timeRange) continue

    const days = DAY_COLUMNS.filter(({ column }) => row[col(column)]?.trim()).map(({ code }) => code)
    if (days.length === 0) continue

    const firstName = row[firstNameIdx] ?? ''
    const lastName = row[lastNameIdx] ?? ''

    results.push({
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

  return results
}
