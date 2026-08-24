import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Input } from '../../design-system/Input/Input'
import { Select } from '../../design-system/Select/Select'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { PageTitle } from '../../design-system/Page/Page'
import { category } from '../../design-system/colors'
import { client } from '../../lib/amplifyClient'
import { fetchUgaBuildings } from '../../lib/ugaBuildings'
import { CLASS_ENTRIES_KEY } from '../../lib/queryKeys'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './SchedulePage.style'

type ClassEntry = Schema['ClassEntry']['type']

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
type Day = (typeof DAYS)[number]

const PX_PER_HOUR = 56
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 18

const COURSE_COLORS = category.courses

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function colorForCourse(code: string) {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  return COURSE_COLORS[hash % COURSE_COLORS.length]
}

function ratingColor(score: number) {
  const clamped = Math.min(5, Math.max(1, score))
  const hue = ((clamped - 1) / 4) * 120
  return `hsl(${hue.toFixed(0)}, 70%, 42%)`
}

function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24
  const h12 = normalized % 12 === 0 ? 12 : normalized % 12
  const suffix = normalized < 12 ? 'a' : 'p'
  return `${h12}${suffix}`
}

type LaidOutEntry = ClassEntry & { column: number; columns: number }

function layoutDay(dayEntries: ClassEntry[]): LaidOutEntry[] {
  const sorted = [...dayEntries].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const clusters: ClassEntry[][] = []
  let current: ClassEntry[] = []
  let currentEnd = -1

  for (const entry of sorted) {
    if (current.length === 0 || toMinutes(entry.startTime) < currentEnd) {
      current.push(entry)
      currentEnd = Math.max(currentEnd, toMinutes(entry.endTime))
    } else {
      clusters.push(current)
      current = [entry]
      currentEnd = toMinutes(entry.endTime)
    }
  }
  if (current.length) clusters.push(current)

  const result: LaidOutEntry[] = []
  for (const cluster of clusters) {
    const columnEnds: number[] = []
    for (const entry of cluster) {
      const start = toMinutes(entry.startTime)
      let column = columnEnds.findIndex((end) => end <= start)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(toMinutes(entry.endTime))
      } else {
        columnEnds[column] = toMinutes(entry.endTime)
      }
      result.push({ ...entry, column, columns: 0 })
    }
    const columns = columnEnds.length
    for (const entry of result.slice(-cluster.length)) entry.columns = columns
  }
  return result
}

type UgaClassMeeting = NonNullable<Schema['UgaClassMeeting']['type']>

type ClassMeeting = {
  crn: string
  courseCode: string
  title: string
  section: string
  scheduleType: string
  instructor: string
  instructorFirstName: string
  instructorLastName: string
  days: Day[]
  startTime: string
  endTime: string
  building: string
  room: string
}

type ClassSection = {
  crn: string
  courseCode: string
  title: string
  section: string
  scheduleType: string
  instructor: string
  instructorFirstName: string
  instructorLastName: string
  meetings: ClassMeeting[]
}

type ProfessorRating = NonNullable<Schema['ProfessorRating']['type']>
type ProfessorReview = NonNullable<Schema['ProfessorReview']['type']>

type SelectedProfessor = {
  name: string
  rating: ProfessorRating
}

function professorKey(firstName: string, lastName: string) {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`
}

function normalizeMeeting(raw: UgaClassMeeting): ClassMeeting | null {
  const days = (raw.days ?? []).filter((d): d is Day => DAYS.includes(d as Day))
  if (!raw.crn || !raw.courseCode || !raw.startTime || !raw.endTime || days.length === 0) return null

  return {
    crn: raw.crn,
    courseCode: raw.courseCode,
    title: raw.title ?? '',
    section: raw.section ?? '',
    scheduleType: raw.scheduleType ?? '',
    instructor: raw.instructor ?? '',
    instructorFirstName: raw.instructorFirstName ?? '',
    instructorLastName: raw.instructorLastName ?? '',
    days,
    startTime: raw.startTime,
    endTime: raw.endTime,
    building: raw.building ?? '',
    room: raw.room ?? '',
  }
}

function groupByCrn(meetings: ClassMeeting[]): ClassSection[] {
  const sections = new Map<string, ClassSection>()
  for (const meeting of meetings) {
    const existing = sections.get(meeting.crn)
    if (existing) {
      existing.meetings.push(meeting)
    } else {
      sections.set(meeting.crn, {
        crn: meeting.crn,
        courseCode: meeting.courseCode,
        title: meeting.title,
        section: meeting.section,
        scheduleType: meeting.scheduleType,
        instructor: meeting.instructor,
        instructorFirstName: meeting.instructorFirstName,
        instructorLastName: meeting.instructorLastName,
        meetings: [meeting],
      })
    }
  }
  return Array.from(sections.values())
}

type CourseOption = {
  crn: string
  instructor: string
  instructorFirstName: string
  instructorLastName: string
  meetings: ClassMeeting[]
}

type CourseGroup = {
  key: string
  courseCode: string
  title: string
  scheduleType: string
  commonMeetings: ClassMeeting[]
  options: CourseOption[]
  sharedInstructor: CourseOption | null
}

function meetingSignature(meeting: ClassMeeting): string {
  return `${[...meeting.days].sort().join(',')}|${meeting.startTime}|${meeting.endTime}|${meeting.building}|${meeting.room}`
}

// Large lecture courses often run several sections that share the exact same
// lecture meeting and differ only in their lab/discussion meeting — group
// those together so the shared part shows once and only the differing part
// is a pick-one list, instead of repeating the same lecture N times.
function groupSections(sections: ClassSection[]): CourseGroup[] {
  const byCourse = new Map<string, ClassSection[]>()
  for (const section of sections) {
    const list = byCourse.get(section.courseCode)
    if (list) list.push(section)
    else byCourse.set(section.courseCode, [section])
  }

  const groups: CourseGroup[] = []

  for (const [courseCode, courseSections] of byCourse) {
    const signatureCounts = new Map<string, number>()
    for (const section of courseSections) {
      for (const meeting of section.meetings) {
        const sig = meetingSignature(meeting)
        signatureCounts.set(sig, (signatureCounts.get(sig) ?? 0) + 1)
      }
    }

    const groupsByKey = new Map<string, CourseGroup>()

    for (const section of courseSections) {
      const commonMeetings: ClassMeeting[] = []
      const variableMeetings: ClassMeeting[] = []
      for (const meeting of section.meetings) {
        if ((signatureCounts.get(meetingSignature(meeting)) ?? 0) >= 2) commonMeetings.push(meeting)
        else variableMeetings.push(meeting)
      }

      const key =
        commonMeetings.length > 0
          ? `${courseCode}::${commonMeetings.map(meetingSignature).sort().join('|')}`
          : `${courseCode}::standalone::${section.crn}`

      let group = groupsByKey.get(key)
      if (!group) {
        group = {
          key,
          courseCode,
          title: section.title,
          scheduleType: section.scheduleType,
          commonMeetings,
          options: [],
          sharedInstructor: null,
        }
        groupsByKey.set(key, group)
        groups.push(group)
      }

      group.options.push({
        crn: section.crn,
        instructor: section.instructor,
        instructorFirstName: section.instructorFirstName,
        instructorLastName: section.instructorLastName,
        meetings: variableMeetings,
      })
    }
  }

  // A "shared meeting" only helps when 2+ options actually branch off it —
  // flatten single-option groups back into a normal, ungrouped section.
  for (const group of groups) {
    if (group.options.length === 1) {
      group.options[0].meetings = [...group.commonMeetings, ...group.options[0].meetings]
      group.commonMeetings = []
      continue
    }

    // If every option happens to share the same instructor (common when a
    // professor's own sections only differ by lab time), show it once at the
    // group level instead of repeating it under every option.
    const [first, ...rest] = group.options
    const sameInstructor = rest.every(
      (option) =>
        option.instructorFirstName === first.instructorFirstName &&
        option.instructorLastName === first.instructorLastName,
    )
    if (sameInstructor && first.instructorFirstName && first.instructorLastName) {
      group.sharedInstructor = first
    }
  }

  return groups
}

export function SchedulePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: CLASS_ENTRIES_KEY,
    queryFn: async () => {
      const { data } = await client.models.ClassEntry.list()
      return data
    },
  })
  const [showForm, setShowForm] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [courseCode, setCourseCode] = useState('')
  const [title, setTitle] = useState('')
  const [day, setDay] = useState<Day>('MON')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [buildingNames, setBuildingNames] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<ClassMeeting[] | null>(null)
  const [professorRatings, setProfessorRatings] = useState<Record<string, ProfessorRating>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [selectedProfessor, setSelectedProfessor] = useState<SelectedProfessor | null>(null)
  const [professorReviews, setProfessorReviews] = useState<ProfessorReview[] | null>(null)
  const [professorReviewsLoading, setProfessorReviewsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchUgaBuildings().then((buildings) => {
      if (!cancelled) setBuildingNames(Array.from(new Set(buildings.map((building) => building.name))))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const { rangeStartHour, rangeEndHour } = useMemo(() => {
    if (entries.length === 0) return { rangeStartHour: DEFAULT_START_HOUR, rangeEndHour: DEFAULT_END_HOUR }
    const starts = entries.map((entry) => toMinutes(entry.startTime))
    const ends = entries.map((entry) => toMinutes(entry.endTime))
    return {
      rangeStartHour: Math.min(DEFAULT_START_HOUR, Math.floor(Math.min(...starts) / 60)),
      rangeEndHour: Math.max(DEFAULT_END_HOUR, Math.ceil(Math.max(...ends) / 60)),
    }
  }, [entries])

  const totalHours = rangeEndHour - rangeStartHour
  const hourMarks = Array.from({ length: totalHours + 1 }, (_, i) => rangeStartHour + i)

  const entriesByDay = useMemo(() => {
    const map = new Map<Day, LaidOutEntry[]>()
    for (const d of DAYS) map.set(d, layoutDay(entries.filter((entry) => entry.day === d)))
    return map
  }, [entries])

  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null
  const selectedCourseEntries = selectedEntry
    ? entries
        .filter((entry) => entry.courseCode === selectedEntry.courseCode)
        .sort((a, b) => DAYS.indexOf(a.day as Day) - DAYS.indexOf(b.day as Day) || a.startTime.localeCompare(b.startTime))
    : []

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseCode.trim() || !startTime || !endTime) return

    const { data } = await client.models.ClassEntry.create({
      courseCode,
      title: title.trim() || undefined,
      day,
      startTime,
      endTime,
      location: location.trim() || undefined,
    })
    if (data) {
      queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) => [...(prev ?? []), data])
    }
    setCourseCode('')
    setTitle('')
    setStartTime('')
    setEndTime('')
    setLocation('')
    setShowForm(false)
  }

  async function handleDelete(courseCode: string) {
    const toDelete = entries.filter((entry) => entry.courseCode === courseCode)
    await Promise.all(toDelete.map((entry) => client.models.ClassEntry.delete({ id: entry.id })))
    queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) =>
      (prev ?? []).filter((entry) => entry.courseCode !== courseCode),
    )
    setSelectedId(null)
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setSearchLoading(true)
    setSearchResults(null)
    try {
      const { data } = await client.queries.searchUgaClasses({ query })
      const meetings = (data ?? [])
        .filter((meeting): meeting is UgaClassMeeting => meeting !== null)
        .map(normalizeMeeting)
        .filter((meeting): meeting is ClassMeeting => meeting !== null)
      setSearchResults(meetings)
      fetchProfessorRatings(meetings)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function fetchProfessorRatings(meetings: ClassMeeting[]) {
    const instructors = new Map<string, { firstName: string; lastName: string }>()
    for (const meeting of meetings) {
      if (!meeting.instructorFirstName || !meeting.instructorLastName) continue
      const key = professorKey(meeting.instructorFirstName, meeting.instructorLastName)
      if (!instructors.has(key) && !(key in professorRatings)) {
        instructors.set(key, { firstName: meeting.instructorFirstName, lastName: meeting.instructorLastName })
      }
    }
    if (instructors.size === 0) return

    Promise.all(
      Array.from(instructors.entries()).map(([key, { firstName, lastName }]) =>
        client.queries
          .getProfessorRating({ firstName, lastName })
          .then(({ data }) => [key, data] as const)
          .catch(() => [key, null] as const),
      ),
    ).then((results) => {
      setProfessorRatings((prev) => {
        const next = { ...prev }
        for (const [key, data] of results) {
          if (data) next[key] = data
        }
        return next
      })
    })
  }

  async function createClassEntries(courseCode: string, title: string, meetings: ClassMeeting[]) {
    const creates = meetings.flatMap((meeting) =>
      meeting.days.map((meetingDay) =>
        client.models.ClassEntry.create({
          courseCode,
          title: title || undefined,
          day: meetingDay,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          location: [meeting.building, meeting.room].filter(Boolean).join(' ') || undefined,
        }),
      ),
    )
    const results = await Promise.all(creates)
    const created = results.map((result) => result.data).filter((entry) => entry !== null) as ClassEntry[]
    queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) => [...(prev ?? []), ...created])
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults(null)
  }

  async function handleAddSection(section: ClassSection) {
    await createClassEntries(section.courseCode, section.title, section.meetings)
  }

  async function handleAddGroupOption(group: CourseGroup, option: CourseOption) {
    await createClassEntries(group.courseCode, group.title, [...group.commonMeetings, ...option.meetings])
  }

  function handleFabClick() {
    if (showForm) {
      setShowForm(false)
      return
    }
    if (showSearch) {
      setShowSearch(false)
      return
    }
    setShowFabMenu((prev) => !prev)
  }

  function handleOpenSearch() {
    setShowFabMenu(false)
    setShowSearch(true)
  }

  function handleOpenManual() {
    setShowFabMenu(false)
    setShowForm(true)
  }

  function openProfessorDetail(firstName: string, lastName: string, name: string) {
    const rating = professorRatings[professorKey(firstName, lastName)]
    if (!rating?.found) return

    setSelectedProfessor({ name, rating })
    setProfessorReviews(null)

    if (!rating.id) {
      setProfessorReviews([])
      return
    }

    setProfessorReviewsLoading(true)
    client.queries
      .getProfessorReviews({ id: rating.id })
      .then(({ data }) => {
        setProfessorReviews((data?.reviews ?? []).filter((review): review is ProfessorReview => review !== null))
      })
      .catch(() => setProfessorReviews([]))
      .finally(() => setProfessorReviewsLoading(false))
  }

  // For now, the class list only shows the professor's name + score; tapping
  // it opens the full breakdown (difficulty, would-retake, reviews).
  function renderProfessorSummary(firstName: string, lastName: string, name: string) {
    if (!name) return null
    const rating = firstName && lastName ? professorRatings[professorKey(firstName, lastName)] : null

    if (!rating?.found) return <S.DetailSub>{name}</S.DetailSub>

    const open = (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      openProfessorDetail(firstName, lastName, name)
    }

    return (
      <S.ProfessorButton
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') open(event)
        }}
      >
        <S.DetailSub>{name}</S.DetailSub>
        {typeof rating.rating === 'number' && (
          <S.RatingBadge style={{ background: ratingColor(rating.rating) }}>{rating.rating.toFixed(1)}</S.RatingBadge>
        )}
      </S.ProfessorButton>
    )
  }

  function renderMeetingList(meetings: ClassMeeting[]) {
    if (meetings.length === 0) return null
    return (
      <S.MeetingList>
        {meetings.map((meeting, index) => (
          <S.MeetingRow key={index}>
            <S.MeetingTopRow>
              <S.DayChip>{meeting.days.map((d) => t(`schedule.days.${d}`).slice(0, 1)).join('')}</S.DayChip>
              {meeting.section && <S.SectionChip>{t('schedule.sectionLabel', { section: meeting.section })}</S.SectionChip>}
            </S.MeetingTopRow>
            <S.MeetingTime>
              {meeting.startTime}–{meeting.endTime}
            </S.MeetingTime>
            {(meeting.building || meeting.room) && (
              <S.MeetingLocationText>{[meeting.building, meeting.room].filter(Boolean).join(' ')}</S.MeetingLocationText>
            )}
          </S.MeetingRow>
        ))}
      </S.MeetingList>
    )
  }

  return (
    <S.Root>
      <S.Padded>
        <PageTitle>{t('nav.schedule')}</PageTitle>
      </S.Padded>

      {showForm && (
        <S.ModalBackdrop onClick={() => setShowForm(false)}>
          <S.Detail onClick={(event) => event.stopPropagation()}>
            <S.DetailBody>
              <S.Form onSubmit={handleSubmit}>
                <S.PanelHeader>
                  <S.DetailCourse>{t('schedule.add')}</S.DetailCourse>
                  <IconButton type="button" onClick={() => setShowForm(false)} aria-label={t('schedule.close')}>
                    ×
                  </IconButton>
                </S.PanelHeader>
                <Input
                  placeholder={t('schedule.courseCode')}
                  value={courseCode}
                  onChange={(event) => setCourseCode(event.target.value)}
                />
                <Input
                  placeholder={t('schedule.title')}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <Select value={day} onChange={(event) => setDay(event.target.value as Day)}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {t(`schedule.days.${d}`)}
                    </option>
                  ))}
                </Select>
                <S.Row>
                  <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                  <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </S.Row>
                <Input
                  list="uga-building-names"
                  placeholder={t('schedule.location')}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
                <datalist id="uga-building-names">
                  {buildingNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <Button type="submit">{t('schedule.save')}</Button>
              </S.Form>
            </S.DetailBody>
          </S.Detail>
        </S.ModalBackdrop>
      )}

      {loading ? (
        <S.Padded>
          <EmptyState>{t('schedule.loading')}</EmptyState>
        </S.Padded>
      ) : (
        <S.GridWrap>
          <S.Grid>
            <S.CornerCell />
            {DAYS.map((d) => (
              <S.DayHeader key={d}>{t(`schedule.days.${d}`).slice(0, 3)}</S.DayHeader>
            ))}

            <S.TimeAxis style={{ height: totalHours * PX_PER_HOUR }}>
              {hourMarks.map((hour) => (
                <S.HourLabel key={hour} style={{ top: (hour - rangeStartHour) * PX_PER_HOUR }}>
                  {formatHour(hour)}
                </S.HourLabel>
              ))}
            </S.TimeAxis>

            {DAYS.map((d) => (
              <S.DayColumn key={d} style={{ height: totalHours * PX_PER_HOUR }}>
                {hourMarks.map((hour) => (
                  <S.HourLine key={hour} style={{ top: (hour - rangeStartHour) * PX_PER_HOUR }} />
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
                      onClick={() => setSelectedId(entry.id)}
                      style={{
                        top,
                        height,
                        left: `${left}%`,
                        width: `calc(${width}% - 4px)`,
                        background: colorForCourse(entry.courseCode),
                      }}
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
      )}

      {showSearch && (
        <S.SearchBackdrop onClick={() => setShowSearch(false)}>
          <S.SearchPanel onClick={(event) => event.stopPropagation()}>
            <S.SearchPanelHeader onSubmit={handleSearch}>
              <S.PanelHeader>
                <S.DetailCourse>{t('schedule.addBySearch')}</S.DetailCourse>
                <IconButton type="button" onClick={() => setShowSearch(false)} aria-label={t('schedule.close')}>
                  ×
                </IconButton>
              </S.PanelHeader>
              <S.Row>
                <Input
                  placeholder={t('schedule.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <Button type="submit">{t('schedule.search')}</Button>
              </S.Row>
            </S.SearchPanelHeader>

            <S.SearchPanelBody>
              {searchLoading && <EmptyState>{t('schedule.searching')}</EmptyState>}

              {!searchLoading && searchResults !== null && searchResults.length === 0 && (
                <EmptyState>{t('schedule.searchEmpty')}</EmptyState>
              )}

              {!searchLoading && searchResults && searchResults.length > 0 && (
                <S.SectionList>
                  {groupSections(groupByCrn(searchResults)).map((group) => {
                    const singleOption = group.options.length === 1 ? group.options[0] : null
                    const selectedCrn = selectedOptions[group.key]
                    const selectedOption = group.options.find((option) => option.crn === selectedCrn) ?? null

                    return (
                      <S.SectionCard key={group.key}>
                        <S.PanelHeader>
                          <S.SectionInfo>
                            <S.DetailCourse>{group.courseCode}</S.DetailCourse>
                            <S.DetailSub>{group.title}</S.DetailSub>
                          </S.SectionInfo>
                          {singleOption && (
                            <Button
                              type="button"
                              onClick={() =>
                                handleAddSection({
                                  crn: singleOption.crn,
                                  courseCode: group.courseCode,
                                  title: group.title,
                                  section: '',
                                  scheduleType: group.scheduleType,
                                  instructor: singleOption.instructor,
                                  instructorFirstName: singleOption.instructorFirstName,
                                  instructorLastName: singleOption.instructorLastName,
                                  meetings: singleOption.meetings,
                                })
                              }
                            >
                              {t('schedule.addSection')}
                            </Button>
                          )}
                        </S.PanelHeader>

                        {singleOption ? (
                          <>
                            {renderProfessorSummary(
                              singleOption.instructorFirstName,
                              singleOption.instructorLastName,
                              singleOption.instructor,
                            )}
                            {renderMeetingList(singleOption.meetings)}
                          </>
                        ) : (
                          <>
                            {group.sharedInstructor &&
                              renderProfessorSummary(
                                group.sharedInstructor.instructorFirstName,
                                group.sharedInstructor.instructorLastName,
                                group.sharedInstructor.instructor,
                              )}
                            {renderMeetingList(group.commonMeetings)}
                            <S.OptionGroup>
                              {group.options.map((option) => (
                                <S.OptionBranch key={option.crn}>
                                  <S.OptionCard
                                    type="button"
                                    $selected={option.crn === selectedCrn}
                                    onClick={() =>
                                      setSelectedOptions((prev) => ({ ...prev, [group.key]: option.crn }))
                                    }
                                  >
                                    {!group.sharedInstructor &&
                                      renderProfessorSummary(
                                        option.instructorFirstName,
                                        option.instructorLastName,
                                        option.instructor,
                                      )}
                                    {renderMeetingList(option.meetings)}
                                  </S.OptionCard>
                                </S.OptionBranch>
                              ))}
                            </S.OptionGroup>
                            <Button
                              type="button"
                              disabled={!selectedOption}
                              onClick={() => selectedOption && handleAddGroupOption(group, selectedOption)}
                            >
                              {t('schedule.addSection')}
                            </Button>
                          </>
                        )}
                      </S.SectionCard>
                    )
                  })}
                </S.SectionList>
              )}
            </S.SearchPanelBody>
          </S.SearchPanel>
        </S.SearchBackdrop>
      )}

      {!loading && entries.length === 0 && (
        <S.Padded>
          <EmptyState>{t('schedule.empty')}</EmptyState>
        </S.Padded>
      )}

      {selectedEntry && (
        <S.ModalBackdrop onClick={() => setSelectedId(null)}>
          <S.Detail onClick={(event) => event.stopPropagation()}>
            <S.DetailAccent style={{ background: colorForCourse(selectedEntry.courseCode) }} />
            <S.DetailBody>
              <S.PanelHeader>
                <S.SectionInfo>
                  <S.DetailCourse>{selectedEntry.title || selectedEntry.courseCode}</S.DetailCourse>
                  {selectedEntry.title && (
                    <S.CoursePill
                      style={{
                        background: `${colorForCourse(selectedEntry.courseCode)}26`,
                        color: colorForCourse(selectedEntry.courseCode),
                      }}
                    >
                      {selectedEntry.courseCode}
                    </S.CoursePill>
                  )}
                </S.SectionInfo>
                <IconButton onClick={() => setSelectedId(null)} aria-label={t('schedule.close')}>
                  ×
                </IconButton>
              </S.PanelHeader>

              <S.MeetingList>
                {selectedCourseEntries.map((entry) => (
                  <S.MeetingRow key={entry.id}>
                    <S.MeetingTopRow>
                      <S.DayChip>{t(`schedule.days.${entry.day as Day}`).slice(0, 1)}</S.DayChip>
                    </S.MeetingTopRow>
                    <S.MeetingTime>
                      {entry.startTime}–{entry.endTime}
                    </S.MeetingTime>
                    {entry.location && <S.MeetingLocationText>{entry.location}</S.MeetingLocationText>}
                  </S.MeetingRow>
                ))}
              </S.MeetingList>

              <S.DangerButton type="button" variant="secondary" onClick={() => handleDelete(selectedEntry.courseCode)}>
                {t('schedule.delete')}
              </S.DangerButton>
            </S.DetailBody>
          </S.Detail>
        </S.ModalBackdrop>
      )}

      {selectedProfessor && (
        <S.ModalBackdrop onClick={() => setSelectedProfessor(null)}>
          <S.Detail onClick={(event) => event.stopPropagation()}>
            {typeof selectedProfessor.rating.rating === 'number' && (
              <S.DetailAccent style={{ background: ratingColor(selectedProfessor.rating.rating) }} />
            )}
            <S.DetailBody>
              <S.PanelHeader>
                <S.DetailCourse>{selectedProfessor.name}</S.DetailCourse>
                <IconButton onClick={() => setSelectedProfessor(null)} aria-label={t('schedule.close')}>
                  ×
                </IconButton>
              </S.PanelHeader>

              <S.RatingRow>
                {typeof selectedProfessor.rating.rating === 'number' && (
                  <S.RatingBadge style={{ background: ratingColor(selectedProfessor.rating.rating) }}>
                    {selectedProfessor.rating.rating.toFixed(1)}
                  </S.RatingBadge>
                )}
                <S.DetailSub>
                  {t('schedule.ratingMeta', {
                    difficulty: selectedProfessor.rating.difficulty?.toFixed(1) ?? '?',
                    count: selectedProfessor.rating.numRatings ?? 0,
                  })}
                  {typeof selectedProfessor.rating.wouldTakeAgainPercent === 'number' &&
                  selectedProfessor.rating.wouldTakeAgainPercent >= 0
                    ? t('schedule.ratingRetake', { percent: Math.round(selectedProfessor.rating.wouldTakeAgainPercent) })
                    : ''}
                </S.DetailSub>
              </S.RatingRow>

              {professorReviewsLoading && <EmptyState>{t('schedule.reviewsLoading')}</EmptyState>}

              {!professorReviewsLoading && professorReviews !== null && professorReviews.length === 0 && (
                <EmptyState>{t('schedule.reviewsEmpty')}</EmptyState>
              )}

              {!professorReviewsLoading && professorReviews && professorReviews.length > 0 && (
                <S.ReviewList>
                  {professorReviews.map((review, index) => (
                    <S.ReviewCard key={index}>
                      <S.DetailSub>
                        {[review.courseCode, review.date?.slice(0, 10), review.grade].filter(Boolean).join(' · ')}
                      </S.DetailSub>
                      <S.ReviewComment>{review.comment}</S.ReviewComment>
                    </S.ReviewCard>
                  ))}
                </S.ReviewList>
              )}
            </S.DetailBody>
          </S.Detail>
        </S.ModalBackdrop>
      )}

      {showFabMenu && <S.FabBackdrop onClick={() => setShowFabMenu(false)} />}
      <S.FabWrap>
        {showFabMenu && (
          <S.FabMenu>
            <S.FabMenuItem type="button" onClick={handleOpenSearch}>
              🔍 {t('schedule.addBySearch')}
            </S.FabMenuItem>
            <S.FabMenuItem type="button" onClick={handleOpenManual}>
              ✏️ {t('schedule.addManually')}
            </S.FabMenuItem>
          </S.FabMenu>
        )}
        <S.Fab type="button" onClick={handleFabClick} aria-label={t('schedule.add')}>
          {showForm || showSearch || showFabMenu ? '×' : '+'}
        </S.Fab>
      </S.FabWrap>
    </S.Root>
  )
}
