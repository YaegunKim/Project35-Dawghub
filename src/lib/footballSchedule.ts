import { client } from './amplifyClient'

export type FootballGameState = 'pre' | 'live' | 'final'

export type FootballGame = {
  gameId: string
  opponent: string
  isHome: boolean
  startTimeEpochMs: number
  gameState: FootballGameState
  period: string
  clock: string
  teamScore: number | null
  opponentScore: number | null
}

// A CFB "season" is named after the year it kicks off in, even though it runs into bowls/
// playoffs the following January — so a game in January still belongs to last year's season.
export function getCurrentFootballSeasonYear(nowMs: number): number {
  const now = new Date(nowMs)
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
}

// The actual NCAA scoreboard fetch/filter happens server-side (get-football-schedule/handler.ts)
// — that source sends no CORS headers, so a direct browser fetch would be blocked; this just
// calls the Lambda-backed query the same way fetchWalkingRoute calls getWalkingRoute.
export async function fetchGeorgiaFootballSchedule(year: number): Promise<FootballGame[]> {
  const { data, errors } = await client.queries.getFootballSchedule({ year })
  if (errors?.length) throw new Error(`getFootballSchedule failed: ${JSON.stringify(errors)}`)

  return (data ?? [])
    .filter((g): g is NonNullable<typeof g> => g != null)
    .map((g) => ({
      gameId: g.gameId ?? '',
      opponent: g.opponent ?? '',
      isHome: g.isHome ?? false,
      startTimeEpochMs: g.startTimeEpochMs ?? 0,
      gameState: (g.gameState as FootballGameState) || 'pre',
      period: g.period ?? '',
      clock: g.clock ?? '',
      teamScore: g.teamScore ?? null,
      opponentScore: g.opponentScore ?? null,
    }))
}

// A live game always wins (that's what a user tapping the marker mid-game wants to see);
// otherwise the next game that hasn't kicked off yet; otherwise there's nothing to show.
export function pickRelevantGame(games: FootballGame[], nowMs: number): FootballGame | null {
  const live = games.find((g) => g.gameState === 'live')
  if (live) return live

  const upcoming = games
    .filter((g) => g.gameState === 'pre' && g.startTimeEpochMs >= nowMs)
    .sort((a, b) => a.startTimeEpochMs - b.startTimeEpochMs)
  return upcoming[0] ?? null
}

function isSameCalendarDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs)
  const b = new Date(bMs)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isFootballGameDay(games: FootballGame[], nowMs: number): boolean {
  return games.some((g) => g.gameState === 'live' || isSameCalendarDay(g.startTimeEpochMs, nowMs))
}
