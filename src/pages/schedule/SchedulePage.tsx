import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../../design-system/Button/Button'
import { Input } from '../../design-system/Input/Input'
import { Select } from '../../design-system/Select/Select'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { Modal } from '../../design-system/Modal/Modal'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { useToast } from '../../design-system/Toast/Toast'
import { PageTitle } from '../../design-system/Page/Page'
import { FriendsDrawer } from '../../app/AppShell/FriendsDrawer'
import { client } from '../../lib/amplifyClient'
import { fetchUgaBuildings } from '../../lib/ugaBuildings'
import { UGA_SUBJECTS } from '../../lib/ugaSubjects'
import { CLASS_ENTRIES_KEY } from '../../lib/queryKeys'
import { DAYS, PX_PER_HOUR, DEFAULT_START_HOUR, DEFAULT_END_HOUR, toMinutes, colorForCourse, formatHour, layoutDay } from '../../lib/scheduleGrid'
import type { Day, LaidOutEntry } from '../../lib/scheduleGrid'
import { buildClassMapIntent, type ScheduleDraft } from '../../lib/scheduleLocationPick'
import type { MapLocationState, MapPickIntent, MapPickResultState } from '../../lib/mapNavigation'
import { MapDirectionsButton } from '../map/popups/MapDirectionsButton'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './SchedulePage.style'

type ClassEntry = Schema['ClassEntry']['type']

const SEARCH_PAGE_SIZE = 20
const LEVEL_OPTIONS = ['1', '2', '3', '4', '5'] as const

function ratingColor(score: number) {
  const clamped = Math.min(5, Math.max(1, score))
  const hue = ((clamped - 1) / 4) * 120
  return `hsl(${hue.toFixed(0)}, 70%, 42%)`
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

// RateMyProfessors reports avgRating as 0 (not null) for professors with zero
// reviews — treat that the same as "no rating" rather than showing a literal 0.
function hasRating(rating: ProfessorRating | undefined | null): rating is ProfessorRating & { rating: number } {
  return typeof rating?.rating === 'number' && (rating.numRatings ?? 0) > 0
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
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const { showToast } = useToast()
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
  // The detail modal always shows the tapped block's own day/time/location up front; every
  // other day this course meets is tucked behind a "See different time" disclosure instead of
  // always being listed, so a 3x/week course doesn't clutter the modal with times the user
  // didn't ask about. Reset to closed whenever a different block is opened (see the effect
  // below).
  const [showOtherMeetings, setShowOtherMeetings] = useState(false)
  const [courseCode, setCourseCode] = useState('')
  const [title, setTitle] = useState('')
  const [day, setDay] = useState<Day>('MON')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [buildingNames, setBuildingNames] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<ClassMeeting[] | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [openFilterMenu, setOpenFilterMenu] = useState<'subject' | 'level' | null>(null)
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  )
  const subjectFilterButtonRef = useRef<HTMLButtonElement>(null)
  const levelFilterButtonRef = useRef<HTMLButtonElement>(null)
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE)
  const [professorRatings, setProfessorRatings] = useState<Record<string, ProfessorRating>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [infoGroup, setInfoGroup] = useState<CourseGroup | null>(null)
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

  // Restores the in-progress add-class form after a round trip to /map for location
  // picking — the modal (and its field state) unmounts on navigation, so MapPage hands
  // the draft back via router state instead of it surviving in place. See
  // src/lib/scheduleLocationPick.ts for the shared contract.
  useEffect(() => {
    const state = routerLocation.state as MapPickResultState | null
    if (!state?.draft) return
    const draft = state.draft as ScheduleDraft
    setCourseCode(draft.courseCode)
    setTitle(draft.title)
    setDay(draft.day)
    setStartTime(draft.startTime)
    setEndTime(draft.endTime)
    if (state.pickedLocation) {
      setLocation(state.pickedLocation.label)
      setLocationLat(state.pickedLocation.lat)
      setLocationLng(state.pickedLocation.lng)
    } else {
      setLocation(draft.location)
      setLocationLat(draft.locationLat)
      setLocationLng(draft.locationLng)
    }
    setShowForm(true)
    navigate('.', { replace: true, state: null })
  }, [routerLocation.state, navigate])




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
    const map = new Map<Day, LaidOutEntry<ClassEntry>[]>()
    for (const d of DAYS) map.set(d, layoutDay(entries.filter((entry) => entry.day === d)))
    return map
  }, [entries])

  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null
  const selectedCourseEntries = selectedEntry
    ? entries
        .filter((entry) => entry.courseCode === selectedEntry.courseCode)
        .sort((a, b) => DAYS.indexOf(a.day as Day) - DAYS.indexOf(b.day as Day) || a.startTime.localeCompare(b.startTime))
    : []
  // Every other day this same course meets, besides the one the user actually tapped in the
  // grid — shown only behind the "See different time" disclosure (see the modal below).
  const otherMeetingEntries = selectedEntry
    ? selectedCourseEntries.filter((entry) => entry.id !== selectedEntry.id)
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
      locationLat: locationLat ?? undefined,
      locationLng: locationLng ?? undefined,
    })
    if (data) {
      queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) => [...(prev ?? []), data])
    }
    setCourseCode('')
    setTitle('')
    setStartTime('')
    setEndTime('')
    setLocation('')
    setLocationLat(null)
    setLocationLng(null)
    setShowForm(false)
  }

  function handlePickLocationOnMap() {
    const draft: ScheduleDraft = { courseCode, title, day, startTime, endTime, location, locationLat, locationLng }
    const pickIntent: MapPickIntent = {
      returnTo: '/schedule',
      hint: t('schedule.pickLocationHint'),
      cancelLabel: t('schedule.cancel'),
      pointLabel: t('schedule.pickLocationLabel'),
      draft,
    }
    navigate('/map', { state: { pickIntent } satisfies MapLocationState })
  }

  async function restoreDeletedEntries(
    snapshot: Array<
      Pick<ClassEntry, 'courseCode' | 'day' | 'startTime' | 'endTime'> & {
        title?: string
        location?: string
        locationLat?: number
        locationLng?: number
      }
    >,
  ) {
    const created = await Promise.all(snapshot.map((entry) => client.models.ClassEntry.create(entry)))
    const restored = created
      .map((result) => result.data as ClassEntry | null)
      .filter((data): data is ClassEntry => data != null)
    queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) => [...(prev ?? []), ...restored])
  }

  async function handleDelete(courseCode: string) {
    const toDelete = entries.filter((entry) => entry.courseCode === courseCode)
    const snapshot = toDelete.map((entry) => ({
      courseCode: entry.courseCode,
      title: entry.title ?? undefined,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      location: entry.location ?? undefined,
      locationLat: entry.locationLat ?? undefined,
      locationLng: entry.locationLng ?? undefined,
    }))

    // Optimistic removal for an immediate response; undo re-creates these entries (with new
    // ids) instead of deferring the real delete — nothing in this app references a
    // ClassEntry by id across a session, so that's simpler and just as correct.
    queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) =>
      (prev ?? []).filter((entry) => entry.courseCode !== courseCode),
    )
    setSelectedId(null)

    const results = await Promise.all(toDelete.map((entry) => client.models.ClassEntry.delete({ id: entry.id })))
    if (results.some((result) => result.errors?.length)) {
      queryClient.setQueryData<ClassEntry[]>(CLASS_ENTRIES_KEY, (prev) => [...(prev ?? []), ...toDelete])
      showToast({ message: t('schedule.deleteFailed'), variant: 'danger' })
      return
    }

    showToast({
      message: t('schedule.deletedToast', { course: courseCode }),
      actionLabel: t('schedule.undo'),
      onAction: () => restoreDeletedEntries(snapshot),
    })
  }

  async function runSearch() {
    setSearchLoading(true)
    setSearchResults(null)
    setVisibleCount(SEARCH_PAGE_SIZE)
    try {
      const { data } = await client.queries.searchUgaClasses({
        query: searchQuery.trim() || undefined,
        subject: subjectFilter || undefined,
        level: levelFilter || undefined,
      })
      const meetings = (data ?? [])
        .filter((meeting): meeting is UgaClassMeeting => meeting !== null)
        .map(normalizeMeeting)
        .filter((meeting): meeting is ClassMeeting => meeting !== null)
      setSearchResults(meetings)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    await runSearch()
  }

  // The filter menu renders in a portal (outside the modal's DOM subtree) so
  // it isn't clipped by S.SearchPanel's `overflow: hidden` (needed there to
  // keep the modal's rounded corners) — so its position has to be computed
  // from the trigger button's actual on-screen position instead of relying
  // on normal in-flow `position: absolute`.
  function toggleFilterMenu(which: 'subject' | 'level') {
    if (openFilterMenu === which) {
      setOpenFilterMenu(null)
      return
    }
    const buttonEl = which === 'subject' ? subjectFilterButtonRef.current : levelFilterButtonRef.current
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setFilterMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setOpenFilterMenu(which)
  }

  // Re-runs whenever the search panel opens (default "browse everything" view)
  // or a filter dropdown changes; free-text query changes only take effect on
  // explicit submit, matching the search button's existing behavior.
  useEffect(() => {
    if (!showSearch) return
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch, subjectFilter, levelFilter])

  // Only fetch ratings for professors teaching the currently visible page of
  // results — the default browse view can match hundreds of sections, and
  // rating every one of them up front would fire that many RateMyProfessors
  // lookups at once instead of the ~20 actually on screen.
  useEffect(() => {
    if (!searchResults) return
    const visibleGroups = sortResultGroups(groupSections(groupByCrn(searchResults))).slice(0, visibleCount)
    const visibleMeetings = visibleGroups.flatMap((group) => [
      ...group.commonMeetings,
      ...group.options.flatMap((option) => option.meetings),
    ])
    fetchProfessorRatings(visibleMeetings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, visibleCount])

  // Opening the detail modal for a different block (or closing it, selectedId -> null) should
  // always start with other-times collapsed, not whatever was left open on the previously
  // opened block.
  useEffect(() => {
    setShowOtherMeetings(false)
  }, [selectedId])

  async function handleGetDirections(entry: { location?: string | null; locationLat?: number | null; locationLng?: number | null }) {
    const intent = await buildClassMapIntent(entry, 'directions')
    if (!intent) return
    navigate('/map', { state: { mapIntent: intent } satisfies MapLocationState })
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

  // Groups with a higher-rated representative professor sort first; groups
  // with no rating yet (not loaded, or professor not found) sink to the end
  // rather than jumping around as ratings stream in.
  function groupRating(group: CourseGroup): number | null {
    const representative = group.options.length === 1 ? group.options[0] : group.sharedInstructor
    if (!representative?.instructorFirstName || !representative.instructorLastName) return null
    const rating = professorRatings[professorKey(representative.instructorFirstName, representative.instructorLastName)]
    return hasRating(rating) ? rating.rating : null
  }

  // "CSCI 1301" -> ['CSCI', 1301], compared subject-then-number so course
  // numbers sort correctly regardless of digit count (e.g. "99" vs "100").
  function compareCourseCode(a: string, b: string): number {
    const [subjectA, numberA] = a.split(/\s+/)
    const [subjectB, numberB] = b.split(/\s+/)
    if (subjectA !== subjectB) return subjectA.localeCompare(subjectB)
    return (parseInt(numberA, 10) || 0) - (parseInt(numberB, 10) || 0)
  }

  function sortResultGroups(groups: CourseGroup[]): CourseGroup[] {
    return [...groups].sort((a, b) => {
      const codeCompare = compareCourseCode(a.courseCode, b.courseCode)
      if (codeCompare !== 0) return codeCompare

      const ratingA = groupRating(a)
      const ratingB = groupRating(b)
      if (ratingA === null && ratingB === null) return 0
      if (ratingA === null) return 1
      if (ratingB === null) return -1
      return ratingB - ratingA
    })
  }

  // For now, the class list only shows the professor's name + score; tapping
  // it opens the full breakdown (difficulty, would-retake, reviews).
  function renderProfessorSummary(firstName: string, lastName: string, name: string) {
    if (!name) return null
    const rating = firstName && lastName ? professorRatings[professorKey(firstName, lastName)] : null

    if (!rating?.found) return <S.ProfessorName>{name}</S.ProfessorName>

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
        <S.ProfessorName>{name}</S.ProfessorName>
        {hasRating(rating) && (
          <S.RatingBadgeCompact $color={ratingColor(rating.rating)}>
            {rating.rating.toFixed(1)}
          </S.RatingBadgeCompact>
        )}
      </S.ProfessorButton>
    )
  }

  // Short day labels vary in length by locale (Korean: single character,
  // English: "Mon"/"Tue"/...) — only join multi-character labels with a
  // separator, so Korean stays compact ("월수") while English stays readable
  // ("Mon/Wed") instead of running together as "MonWed".
  function formatDays(days: Day[]) {
    const labels = days.map((d) => t(`schedule.daysShort.${d}`))
    const separator = labels.some((label) => label.length > 1) ? '/' : ''
    return labels.join(separator)
  }

  function renderMeetingList(meetings: ClassMeeting[]) {
    if (meetings.length === 0) return null
    return (
      <S.MeetingList>
        {meetings.map((meeting, index) => (
          <S.MeetingRow key={index}>
            <S.DayChip>{formatDays(meeting.days)}</S.DayChip>
            <S.MeetingTime>
              {meeting.startTime}–{meeting.endTime}
            </S.MeetingTime>
            {(meeting.building || meeting.room) && (
              <S.MeetingLocationText>{[meeting.building, meeting.room].filter(Boolean).join(' ')}</S.MeetingLocationText>
            )}
            {meeting.section && meeting.section !== '0' && (
              <S.SectionChip>{t('schedule.sectionLabel', { section: meeting.section })}</S.SectionChip>
            )}
          </S.MeetingRow>
        ))}
      </S.MeetingList>
    )
  }

  // A single meeting's full detail — day, time, location, and (when there's a location to go
  // to) a Get Directions button — used both for the tapped block itself and for any other day
  // revealed via "See different time" in the detail modal below.
  function renderMeetingDetailRow(entry: ClassEntry) {
    const hasLocation = Boolean(entry.location) || (entry.locationLat != null && entry.locationLng != null)
    return (
      <S.MeetingRow key={entry.id}>
        <S.MeetingInfo>
          <S.DayChip>{t(`schedule.daysShort.${entry.day as Day}`)}</S.DayChip>
          <S.MeetingTime>
            {entry.startTime}–{entry.endTime}
          </S.MeetingTime>
          {entry.location && <S.MeetingLocationText>{entry.location}</S.MeetingLocationText>}
        </S.MeetingInfo>
        {hasLocation && <MapDirectionsButton onClick={() => handleGetDirections(entry)} />}
      </S.MeetingRow>
    )
  }

  return (
    <S.Root>
      <S.Padded>
        <S.TitleRow>
          <PageTitle>{t('nav.schedule')}</PageTitle>
          <FriendsDrawer />
        </S.TitleRow>
      </S.Padded>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} maxWidth="400px">
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
              <S.LocationRow>
                <Input
                  list="uga-building-names"
                  placeholder={t('schedule.location')}
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value)
                    setLocationLat(null)
                    setLocationLng(null)
                  }}
                />
                <Button type="button" variant="secondary" onClick={handlePickLocationOnMap}>
                  {t('schedule.setLocation')}
                </Button>
              </S.LocationRow>
              {locationLat != null && locationLng != null && (
                <S.LocationPickedNote>{t('schedule.locationPickedNote')}</S.LocationPickedNote>
              )}
              <datalist id="uga-building-names">
                {buildingNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <Button type="submit">{t('schedule.save')}</Button>
            </S.Form>
          </S.DetailBody>
        </Modal>
      )}

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
                    onClick={() => setSelectedId(entry.id)}
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

      {showSearch && (
        <Modal onClose={() => setShowSearch(false)} maxWidth="420px" maxWidthTablet="520px">
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
            <S.Row>
              <S.FilterMenuWrap>
                <S.FilterButton
                  ref={subjectFilterButtonRef}
                  type="button"
                  $active={openFilterMenu === 'subject'}
                  onClick={() => toggleFilterMenu('subject')}
                >
                  <span>{subjectFilter || t('schedule.filterAllSubjects')}</span>
                  <FontAwesomeIcon icon={faChevronDown} />
                </S.FilterButton>
              </S.FilterMenuWrap>
              <S.FilterMenuWrap>
                <S.FilterButton
                  ref={levelFilterButtonRef}
                  type="button"
                  $active={openFilterMenu === 'level'}
                  onClick={() => toggleFilterMenu('level')}
                >
                  <span>
                    {levelFilter
                      ? t('schedule.levelLabel', { label: levelFilter === '5' ? '5000+' : `${levelFilter}000` })
                      : t('schedule.filterAllLevels')}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} />
                </S.FilterButton>
              </S.FilterMenuWrap>
            </S.Row>
          </S.SearchPanelHeader>

          {openFilterMenu &&
            filterMenuPosition &&
            createPortal(
              <>
                <S.FilterMenuBackdrop onClick={() => setOpenFilterMenu(null)} />
                <S.FilterMenu
                  $top={filterMenuPosition.top}
                  $left={filterMenuPosition.left}
                  $width={Math.max(filterMenuPosition.width, 220)}
                >
                  {openFilterMenu === 'subject' ? (
                    <>
                      <S.FilterMenuItem
                        type="button"
                        $selected={!subjectFilter}
                        onClick={() => {
                          setSubjectFilter('')
                          setOpenFilterMenu(null)
                        }}
                      >
                        {t('schedule.filterAllSubjects')}
                      </S.FilterMenuItem>
                      {UGA_SUBJECTS.map((subject) => (
                        <S.FilterMenuItem
                          key={subject.code}
                          type="button"
                          $selected={subjectFilter === subject.code}
                          onClick={() => {
                            setSubjectFilter(subject.code)
                            setOpenFilterMenu(null)
                          }}
                        >
                          {subject.description ? `${subject.code} — ${subject.description}` : subject.code}
                        </S.FilterMenuItem>
                      ))}
                    </>
                  ) : (
                    <>
                      <S.FilterMenuItem
                        type="button"
                        $selected={!levelFilter}
                        onClick={() => {
                          setLevelFilter('')
                          setOpenFilterMenu(null)
                        }}
                      >
                        {t('schedule.filterAllLevels')}
                      </S.FilterMenuItem>
                      {LEVEL_OPTIONS.map((level) => (
                        <S.FilterMenuItem
                          key={level}
                          type="button"
                          $selected={levelFilter === level}
                          onClick={() => {
                            setLevelFilter(level)
                            setOpenFilterMenu(null)
                          }}
                        >
                          {t('schedule.levelLabel', { label: level === '5' ? '5000+' : `${level}000` })}
                        </S.FilterMenuItem>
                      ))}
                    </>
                  )}
                </S.FilterMenu>
              </>,
              document.body,
            )}

          <S.SearchPanelBody
            onScroll={(event) => {
              const el = event.currentTarget
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
                setVisibleCount((prev) => prev + SEARCH_PAGE_SIZE)
              }
            }}
          >
            {searchLoading && (
              <S.SectionList>
                {[0, 1, 2].map((i) => (
                  <S.SectionCard key={i}>
                    <Skeleton height="16px" width="45%" />
                    <Skeleton height="28px" width="85%" radius="8px" />
                  </S.SectionCard>
                ))}
              </S.SectionList>
            )}

            {!searchLoading && searchResults !== null && searchResults.length === 0 && (
              <EmptyState>{t('schedule.searchEmpty')}</EmptyState>
            )}

            {!searchLoading && searchResults && searchResults.length > 0 && (
              <S.SectionList>
                {sortResultGroups(groupSections(groupByCrn(searchResults)))
                  .slice(0, visibleCount)
                  .map((group) => {
                  const singleOption = group.options.length === 1 ? group.options[0] : null
                  const selectedCrn = selectedOptions[group.key]
                  const selectedOption = group.options.find((option) => option.crn === selectedCrn) ?? null

                  return (
                    <S.SectionCard key={group.key}>
                      <S.SectionHeader>
                        <S.PanelHeader>
                          <S.CourseCodeRow>
                            <S.DetailCourse>{group.courseCode}</S.DetailCourse>
                            <S.InfoButton
                              type="button"
                              onClick={() => setInfoGroup(group)}
                              aria-label={t('schedule.courseInfo')}
                            >
                              <FontAwesomeIcon icon={faCircleInfo} />
                            </S.InfoButton>
                          </S.CourseCodeRow>
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

                        {singleOption &&
                          renderProfessorSummary(
                            singleOption.instructorFirstName,
                            singleOption.instructorLastName,
                            singleOption.instructor,
                          )}
                        {!singleOption &&
                          group.sharedInstructor &&
                          renderProfessorSummary(
                            group.sharedInstructor.instructorFirstName,
                            group.sharedInstructor.instructorLastName,
                            group.sharedInstructor.instructor,
                          )}
                      </S.SectionHeader>

                      {singleOption ? (
                        <>{renderMeetingList(singleOption.meetings)}</>
                      ) : (
                        <>
                          {renderMeetingList(group.commonMeetings)}
                          <S.OptionGroup>
                            {group.options.map((option) => (
                              <S.OptionCard
                                key={option.crn}
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
        </Modal>
      )}

      {entries.length === 0 && (
        <S.Padded>
          <EmptyState>{loading ? t('schedule.loading') : t('schedule.empty')}</EmptyState>
        </S.Padded>
      )}

      {selectedEntry && (
        <Modal onClose={() => setSelectedId(null)}>
          <S.DetailAccent $color={colorForCourse(selectedEntry.courseCode)} />
          <S.DetailBody>
            <S.PanelHeader>
              <S.SectionInfo>
                <S.DetailCourse>{selectedEntry.title || selectedEntry.courseCode}</S.DetailCourse>
                {selectedEntry.title && (
                  <S.CoursePill $color={colorForCourse(selectedEntry.courseCode)}>
                    {selectedEntry.courseCode}
                  </S.CoursePill>
                )}
              </S.SectionInfo>
              <IconButton onClick={() => setSelectedId(null)} aria-label={t('schedule.close')}>
                ×
              </IconButton>
            </S.PanelHeader>

            <S.MeetingList>
              {renderMeetingDetailRow(selectedEntry)}
              {otherMeetingEntries.length > 0 && (
                <S.SeeOtherTimesToggle type="button" onClick={() => setShowOtherMeetings((value) => !value)}>
                  {t('schedule.seeDifferentTime')}
                  <FontAwesomeIcon icon={showOtherMeetings ? faChevronUp : faChevronDown} />
                </S.SeeOtherTimesToggle>
              )}
              {showOtherMeetings && otherMeetingEntries.map((entry) => renderMeetingDetailRow(entry))}
            </S.MeetingList>

            <Button type="button" variant="danger" onClick={() => handleDelete(selectedEntry.courseCode)}>
              {t('schedule.delete')}
            </Button>
          </S.DetailBody>
        </Modal>
      )}

      {infoGroup && (
        <Modal onClose={() => setInfoGroup(null)}>
          <S.DetailBody>
            <S.PanelHeader>
              <S.DetailCourse>{infoGroup.courseCode}</S.DetailCourse>
              <IconButton onClick={() => setInfoGroup(null)} aria-label={t('schedule.close')}>
                ×
              </IconButton>
            </S.PanelHeader>
            <S.DetailSub>{infoGroup.title}</S.DetailSub>
            {infoGroup.scheduleType && <S.DetailSub>{infoGroup.scheduleType}</S.DetailSub>}
          </S.DetailBody>
        </Modal>
      )}

      {selectedProfessor && (
        <Modal onClose={() => setSelectedProfessor(null)}>
          {hasRating(selectedProfessor.rating) && (
            <S.DetailAccent $color={ratingColor(selectedProfessor.rating.rating)} />
          )}
          <S.DetailBody>
            <S.PanelHeader>
              <S.DetailCourse>{selectedProfessor.name}</S.DetailCourse>
              <IconButton onClick={() => setSelectedProfessor(null)} aria-label={t('schedule.close')}>
                ×
              </IconButton>
            </S.PanelHeader>

            <S.RatingRow>
              {hasRating(selectedProfessor.rating) && (
                <S.RatingBadge $color={ratingColor(selectedProfessor.rating.rating)}>
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
        </Modal>
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
