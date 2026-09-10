import type { AppSyncResolverHandler } from 'aws-lambda'

// NCAA's own scoreboard JSON (the same data ncaa.com's site loads client-side) — no API key,
// but also no CORS headers, so this has to be fetched server-side and proxied to the frontend
// rather than called directly from the browser (unlike Passio's bus API, which is CORS-open).
const NCAA_SCOREBOARD_BASE = 'https://data.ncaa.com/casablanca/scoreboard/football/fbs'
const GEORGIA_SEO = 'georgia'

// Regular season (~15 weeks) + conference championship week, with a little headroom for
// postseason/CFP weeks that may not always be indexed under the same scheme. A week that
// doesn't exist yet (or ever) just 404s and contributes no games — never throws.
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

type NcaaTeamSide = {
  score: string
  names: { seo: string; short: string; char6: string }
}

type NcaaGameEntry = {
  game: {
    gameID: string
    home: NcaaTeamSide
    away: NcaaTeamSide
    startTimeEpoch: string
    gameState: string
    currentPeriod: string
    contestClock: string
  }
}

function parseScore(raw: string): number | null {
  return raw === '' ? null : Number(raw)
}

async function fetchWeek(year: number, week: number): Promise<NcaaGameEntry[]> {
  try {
    const weekStr = String(week).padStart(2, '0')
    const response = await fetch(`${NCAA_SCOREBOARD_BASE}/${year}/${weekStr}/scoreboard.json`)
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data.games) ? data.games : []
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
  weeks.forEach((weekEntries) => {
    weekEntries.forEach((entry) => {
      const g = entry.game
      if (!g) return
      const isHome = g.home.names.seo === GEORGIA_SEO
      const isAway = g.away.names.seo === GEORGIA_SEO
      if (!isHome && !isAway) return

      const us = isHome ? g.home : g.away
      const opponent = isHome ? g.away : g.home

      games.push({
        gameId: g.gameID,
        opponent: opponent.names.short || opponent.names.char6,
        isHome,
        startTimeEpochMs: Number(g.startTimeEpoch) * 1000,
        gameState: g.gameState || 'pre',
        period: g.currentPeriod ?? '',
        clock: g.contestClock ?? '',
        teamScore: parseScore(us.score),
        opponentScore: parseScore(opponent.score),
      })
    })
  })

  return games.sort((a, b) => a.startTimeEpochMs - b.startTimeEpochMs)
}
