import type { AppSyncResolverHandler } from 'aws-lambda'

// ncaa.com's own scoreboard now runs on this internal GraphQL API (sdataprod.ncaa.com) instead
// of the old data.ncaa.com/casablanca static JSON — confirmed by capturing the real site's own
// network requests, since the old endpoint stopped being updated for the current season (it
// still serves past seasons, just never got the current one, which is what caused "no upcoming
// game" to show even mid-season). Like the old endpoint, this is undocumented/unofficial (an
// internal persisted GraphQL query, versioned by a hash tied to ncaa.com's own frontend build)
// and has no CORS headers either, so it still has to be proxied server-side.
const NCAA_CONTESTS_URL = 'https://sdataprod.ncaa.com/'
const PERSISTED_QUERY_HASH = '4bcb5e6432fa9da365c0c19af01b1f9015cc7eb5c21e7af2dba308784a166df7'
const GEORGIA_SEO = 'georgia'
const SPORT_CODE = 'MFB'
const FBS_DIVISION = 11

// Regular season (~15 weeks) + conference championship week, with a little headroom for
// postseason/CFP weeks that may not always be indexed under the same scheme. A week that
// doesn't exist yet (or ever) just comes back empty and contributes no games — never throws.
const MAX_WEEKS_TO_PROBE = 20

type Args = {
  year: number
}

type Result = {
  gameId: string
  opponent: string
  isHome: boolean
  startTimeEpochMs: number
  gameState: string
  period: string
  clock: string
  teamScore: number | null
  opponentScore: number | null
}

type NcaaTeam = {
  isHome: boolean
  seoname: string
  nameShort: string
  name6Char: string
  score: number | null
}

type NcaaContest = {
  contestId: number
  statusCodeDisplay: string
  currentPeriod: string
  contestClock: string
  startTimeEpoch: number
  teams: NcaaTeam[]
}

async function fetchWeek(year: number, week: number): Promise<NcaaContest[]> {
  try {
    const variables = JSON.stringify({
      sportCode: SPORT_CODE,
      division: FBS_DIVISION,
      seasonYear: year,
      contestDate: null,
      week,
    })
    const extensions = JSON.stringify({ persistedQuery: { version: 1, sha256Hash: PERSISTED_QUERY_HASH } })
    const url = `${NCAA_CONTESTS_URL}?meta=GetContests_web&queryName=GetContests_web&extensions=${encodeURIComponent(extensions)}&variables=${encodeURIComponent(variables)}`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data?.data?.contests) ? data.data.contests : []
  } catch {
    return []
  }
}

export const handler: AppSyncResolverHandler<Args, Result[]> = async (event) => {
  const { year } = event.arguments

  const weeks = await Promise.all(
    Array.from({ length: MAX_WEEKS_TO_PROBE }, (_, index) => fetchWeek(year, index + 1)),
  )

  const games: Result[] = []
  const seenContestIds = new Set<number>()
  weeks.forEach((contests) => {
    contests.forEach((contest) => {
      if (seenContestIds.has(contest.contestId)) return
      const us = contest.teams.find((t) => t.seoname === GEORGIA_SEO)
      if (!us) return
      seenContestIds.add(contest.contestId)

      const opponent = contest.teams.find((t) => t.seoname !== GEORGIA_SEO)

      games.push({
        gameId: String(contest.contestId),
        opponent: opponent?.nameShort || opponent?.name6Char || '',
        isHome: us.isHome,
        startTimeEpochMs: contest.startTimeEpoch * 1000,
        gameState: contest.statusCodeDisplay || 'pre',
        period: contest.currentPeriod ?? '',
        clock: contest.contestClock ?? '',
        teamScore: us.score,
        opponentScore: opponent?.score ?? null,
      })
    })
  })

  return games.sort((a, b) => a.startTimeEpochMs - b.startTimeEpochMs)
}
