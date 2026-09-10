import type { AppSyncResolverHandler } from 'aws-lambda'

// Source: bulletin.uga.edu's own course search/detail pages (server-rendered HTML, no
// JS execution needed) — there is no official catalog API, same "unofficial, can break
// silently" category as search-uga-classes' reg.uga.edu CSV and get-professor-rating's
// RMP call. Confirmed structure by fetching a real search result
// (bulletin.uga.edu/Course?coursePrefix=CSCI+1301) and a real detail page
// (bulletin.uga.edu/Course/Details/4695) directly — see ai/TRD.md §4.4.
const SEARCH_URL = 'https://bulletin.uga.edu/Course'
const DETAILS_URL = 'https://bulletin.uga.edu/Course/Details'

// Catalog text changes at most once per catalog year — cache per-container to avoid
// re-fetching two pages for a course multiple students look up in the same warm Lambda.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { entry: Result; fetchedAt: number }>()

type Args = {
  courseCode: string
}

type Result = {
  found: boolean
  courseCode: string | null
  creditHours: string | null
  description: string | null
  prerequisites: string | null
}

const NOT_FOUND: Result = { found: false, courseCode: null, creditHours: null, description: null, prerequisites: null }

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '))
}

// Splits "CSCI 4060" into ["CSCI", "4060"]; the bulletin's own search field is a
// subject + course-number pair, not a single free-text query.
function parseCourseCode(courseCode: string): { subject: string; number: string } | null {
  const match = courseCode.trim().match(/^([A-Za-z]+)\s*(\d[\dA-Za-z]*)$/)
  if (!match) return null
  return { subject: match[1].toUpperCase(), number: match[2].toUpperCase() }
}

async function fetchCourseDetailId(subject: string, number: string): Promise<{ id: string; card: string } | null> {
  const res = await fetch(`${SEARCH_URL}?coursePrefix=${subject}+${number}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DawgHubBot/1.0)' },
  })
  if (!res.ok) return null
  const html = await res.text()

  const cards = html.split('<div class="course-card">').slice(1)
  const target = `${subject} ${number}`
  for (const card of cards) {
    const codeMatch = card.match(/class="crn"[^>]*href="\/Course\/Details\/(\d+)"[^>]*>([^<]+)</)
    if (!codeMatch) continue
    const [, id, rawCode] = codeMatch
    // A combined lecture/lab code like "CSCI 1301-1301L" should still match "CSCI 1301".
    if (decodeHtmlEntities(rawCode).toUpperCase().startsWith(target)) {
      return { id, card }
    }
  }
  return null
}

function extractFromCard(card: string): { creditHours: string | null; description: string | null } {
  const creditMatch = card.match(/class="credit-number"[^>]*>([^<]+)</)
  const descMatch = card.match(/course-card--bottom">\s*<p[^>]*>([^<]+)</)
  return {
    creditHours: creditMatch ? decodeHtmlEntities(creditMatch[1]) : null,
    description: descMatch ? decodeHtmlEntities(descMatch[1]) : null,
  }
}

async function fetchPrerequisites(id: string): Promise<string | null> {
  const res = await fetch(`${DETAILS_URL}/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DawgHubBot/1.0)' } })
  if (!res.ok) return null
  const html = await res.text()

  const pairs = html.matchAll(/class="large-mws"[^>]*>([^<]+)<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/g)
  for (const [, label, value] of pairs) {
    if (decodeHtmlEntities(label).toLowerCase().startsWith('prerequisite')) {
      return stripTags(value) || null
    }
  }
  return null
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const parsed = parseCourseCode(event.arguments.courseCode)
  if (!parsed) return NOT_FOUND
  const cacheKey = `${parsed.subject} ${parsed.number}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.entry

  try {
    const found = await fetchCourseDetailId(parsed.subject, parsed.number)
    if (!found) {
      cache.set(cacheKey, { entry: NOT_FOUND, fetchedAt: Date.now() })
      return NOT_FOUND
    }

    const { creditHours, description } = extractFromCard(found.card)
    const prerequisites = await fetchPrerequisites(found.id)

    const entry: Result = { found: true, courseCode: cacheKey, creditHours, description, prerequisites }
    cache.set(cacheKey, { entry, fetchedAt: Date.now() })
    return entry
  } catch {
    // bulletin.uga.edu is unofficial/undocumented — a layout change or an outage should
    // degrade to "not found" for this one lookup, not fail the whole post/thread view.
    return NOT_FOUND
  }
}
