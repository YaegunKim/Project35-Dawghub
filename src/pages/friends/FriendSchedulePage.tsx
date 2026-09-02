import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { PageTitle } from '../../design-system/Page/Page'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { FriendsDrawer } from '../../app/AppShell/FriendsDrawer'
import { client } from '../../lib/amplifyClient'
import { FRIEND_SCHEDULE_KEY, FRIENDSHIPS_KEY } from '../../lib/queryKeys'
import { DAYS, PX_PER_HOUR, DEFAULT_START_HOUR, DEFAULT_END_HOUR, toMinutes, colorForCourse, formatHour, layoutDay } from '../../lib/scheduleGrid'
import type { Day } from '../../lib/scheduleGrid'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './FriendSchedulePage.style'

type Friendship = Schema['Friendship']['type']

type FriendEntry = {
  id: string
  courseCode: string
  title: string | null
  day: Day
  startTime: string
  endTime: string
  location: string | null
}

function normalize(raw: NonNullable<Schema['FriendClassEntry']['type']>): FriendEntry | null {
  if (!raw.id || !raw.courseCode || !raw.startTime || !raw.endTime) return null
  if (!DAYS.includes(raw.day as Day)) return null
  return {
    id: raw.id,
    courseCode: raw.courseCode,
    title: raw.title ?? null,
    day: raw.day as Day,
    startTime: raw.startTime,
    endTime: raw.endTime,
    location: raw.location ?? null,
  }
}

export function FriendSchedulePage() {
  const { t } = useTranslation()
  const { friendUserId = '' } = useParams<{ friendUserId: string }>()
  const queryClient = useQueryClient()

  const friendEmail = useMemo(() => {
    const friendships = queryClient.getQueryData<Friendship[]>(FRIENDSHIPS_KEY) ?? []
    const match = friendships.find(
      (f) => f.senderId.startsWith(friendUserId) || f.recipientId.startsWith(friendUserId),
    )
    if (!match) return null
    return match.senderId.startsWith(friendUserId) ? match.senderEmail : match.recipientEmail
  }, [queryClient, friendUserId])

  const { data: rawEntries = [], isLoading } = useQuery({
    queryKey: FRIEND_SCHEDULE_KEY(friendUserId),
    queryFn: async () => {
      const res = await client.queries.getFriendSchedule({ friendUserId })
      return res.data ?? []
    },
    enabled: friendUserId.length > 0,
  })

  const entries = useMemo(
    () => rawEntries.filter((e): e is NonNullable<typeof e> => e !== null).map(normalize).filter((e): e is FriendEntry => e !== null),
    [rawEntries],
  )

  const { rangeStartHour, rangeEndHour } = useMemo(() => {
    if (entries.length === 0) return { rangeStartHour: DEFAULT_START_HOUR, rangeEndHour: DEFAULT_END_HOUR }
    const starts = entries.map((e) => toMinutes(e.startTime))
    const ends = entries.map((e) => toMinutes(e.endTime))
    return {
      rangeStartHour: Math.min(DEFAULT_START_HOUR, Math.floor(Math.min(...starts) / 60)),
      rangeEndHour: Math.max(DEFAULT_END_HOUR, Math.ceil(Math.max(...ends) / 60)),
    }
  }, [entries])

  const totalHours = rangeEndHour - rangeStartHour
  const hourMarks = Array.from({ length: totalHours + 1 }, (_, i) => rangeStartHour + i)

  const entriesByDay = useMemo(() => {
    const map = new Map<Day, ReturnType<typeof layoutDay<FriendEntry>>>()
    for (const d of DAYS) map.set(d, layoutDay(entries.filter((entry) => entry.day === d)))
    return map
  }, [entries])

  return (
    <S.Root>
      <S.Padded>
        <BackLink to="/schedule">{t('friends.backToSchedule')}</BackLink>
        <S.TitleRow>
          <S.TitleWrap>
            <PageTitle>
              {friendEmail ? t('friends.scheduleTitle', { email: friendEmail }) : t('friends.scheduleTitleGeneric')}
            </PageTitle>
          </S.TitleWrap>
          <FriendsDrawer />
        </S.TitleRow>
      </S.Padded>

      <S.GridWrap>
        <S.Grid>
          <S.CornerCell />
          {DAYS.map((d) => (
            <S.DayHeader key={d}>{t(`schedule.days.${d}`).slice(0, 3)}</S.DayHeader>
          ))}

          <S.TimeAxis $height={totalHours * PX_PER_HOUR}>
            {hourMarks.map((hour) => (
              <S.HourLabel key={hour} $top={(hour - rangeStartHour) * PX_PER_HOUR}>
                {formatHour(hour)}
              </S.HourLabel>
            ))}
          </S.TimeAxis>

          {DAYS.map((d) => (
            <S.DayColumn key={d} $height={totalHours * PX_PER_HOUR}>
              {hourMarks.map((hour) => (
                <S.HourLine key={hour} $top={(hour - rangeStartHour) * PX_PER_HOUR} />
              ))}
              {(entriesByDay.get(d) ?? []).map((entry) => {
                const top = ((toMinutes(entry.startTime) - rangeStartHour * 60) / 60) * PX_PER_HOUR
                const height = Math.max(
                  ((toMinutes(entry.endTime) - toMinutes(entry.startTime)) / 60) * PX_PER_HOUR,
                  20,
                )
                const width = 100 / entry.columns
                const left = entry.column * width
                return (
                  <S.Block
                    key={entry.id}
                    $top={top}
                    $height={height}
                    $left={`${left}%`}
                    $width={`calc(${width}% - 4px)`}
                    $color={colorForCourse(entry.courseCode)}
                  >
                    <S.BlockCourse>{entry.courseCode}</S.BlockCourse>
                    {height > 34 && (
                      <S.BlockTime>
                        {entry.startTime}–{entry.endTime}
                      </S.BlockTime>
                    )}
                    {height > 50 && entry.location && <S.BlockLocation>{entry.location}</S.BlockLocation>}
                  </S.Block>
                )
              })}
            </S.DayColumn>
          ))}
        </S.Grid>
      </S.GridWrap>

      {entries.length === 0 && (
        <S.Padded>
          <EmptyState>{isLoading ? t('friends.scheduleLoading') : t('friends.scheduleEmpty')}</EmptyState>
        </S.Padded>
      )}
    </S.Root>
  )
}
