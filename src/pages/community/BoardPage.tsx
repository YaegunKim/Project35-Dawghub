import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  faBookmark,
  faBullhorn,
  faHouseChimney,
  faBookOpen,
  faCalendarDay,
  faArrowUpRightFromSquare,
  faPen,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Input } from '../../design-system/Input/Input'
import { Textarea } from '../../design-system/Textarea/Textarea'
import { SegmentedControl } from '../../design-system/SegmentedControl/SegmentedControl'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import { useFavorites } from '../../lib/useFavorites'
import { fetchUgaBuildings, type UgaBuilding } from '../../lib/ugaBuildings'
import { upcomingMilestones } from '../../lib/academicCalendar'
import { BuildingAutocomplete } from '../map/BuildingAutocomplete'
import { category } from '../../design-system/colors'
import type { Schema } from '../../../amplify/data/resource'
import { CourseCodeField } from './CourseCodeField'
import { ClassLookupModal } from './ClassLookupModal'
import { CommunityEmptyState } from './CommunityEmptyState'
import { S } from './BoardPage.style'

const BOARD_ICONS = {
  general: faBullhorn,
  housing: faHouseChimney,
  classes: faBookOpen,
  events: faCalendarDay,
} as const

const GENERAL_DOT_COLOR: Record<string, string> = {
  NOTICE: category.generalCategory.notice,
  FREE_TALK: category.generalCategory.freeTalk,
  QNA: category.generalCategory.qna,
  TIMETABLE: category.generalCategory.timetable,
}

type Post = Schema['Post']['type']

const BOARD_ENUM_MAP = {
  general: 'GENERAL',
  housing: 'HOUSING',
  classes: 'CLASSES',
  events: 'EVENTS',
} as const

type BoardId = keyof typeof BOARD_ENUM_MAP

function isBoardId(value: string | undefined): value is BoardId {
  return !!value && value in BOARD_ENUM_MAP
}

const GENERAL_CATEGORIES = ['NOTICE', 'FREE_TALK', 'QNA', 'TIMETABLE'] as const
const HOUSING_TYPES = ['DORM_REVIEW', 'SUBLEASE'] as const
const EVENT_TAGS = ['FREE_FOOD', 'CLUB', 'ACADEMIC', 'ATHLETICS', 'GREEK_LIFE', 'OTHER'] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { isFavorite, toggleFavorite } = useFavorites('dawghub:community:scrapped')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // General
  const [postCategory, setPostCategory] = useState<string>('FREE_TALK')
  const [generalFilter, setGeneralFilter] = useState<string>('ALL')

  // Housing
  const [housingType, setHousingType] = useState<'' | (typeof HOUSING_TYPES)[number]>('')
  const [dormBuilding, setDormBuilding] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [moveOutDate, setMoveOutDate] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [buildings, setBuildings] = useState<UgaBuilding[]>([])

  // Classes
  const [courseCode, setCourseCode] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [lookupCourseCode, setLookupCourseCode] = useState<string | null>(null)

  // Events
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [freeFoodOnly, setFreeFoodOnly] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)

  const validBoard = isBoardId(boardId)
  const boardValue = validBoard ? BOARD_ENUM_MAP[boardId] : undefined

  useEffect(() => {
    if (boardValue !== 'HOUSING' && boardValue !== 'EVENTS') return
    let cancelled = false
    fetchUgaBuildings().then((data) => {
      if (!cancelled) setBuildings(data)
    })
    return () => {
      cancelled = true
    }
  }, [boardValue])

  const {
    data: posts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['posts', boardValue],
    queryFn: async () => {
      const { data } = await client.models.Post.list({ filter: { board: { eq: boardValue! } } })
      return data
    },
    enabled: !!boardValue,
  })

  function resetComposer() {
    setTitle('')
    setBody('')
    setPostCategory('FREE_TALK')
    setHousingType('')
    setDormBuilding('')
    setMoveInDate('')
    setMoveOutDate('')
    setMonthlyRent('')
    setCourseCode('')
    setEventDate('')
    setEventStartTime('')
    setEventEndTime('')
    setEventLocation('')
    setExternalLink('')
    setTags([])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!boardValue) return
    if (!title.trim() || !body.trim()) {
      setValidationError(true)
      return
    }
    if (boardValue === 'HOUSING' && housingType && !dormBuilding.trim()) {
      setValidationError(true)
      return
    }
    if (boardValue === 'EVENTS') {
      if (!eventDate || !eventStartTime) {
        setValidationError(true)
        return
      }
      if (eventDate < todayIso()) {
        showToast({ message: t('community.events.pastDateValidation'), variant: 'danger' })
        return
      }
    }

    setValidationError(false)
    setSubmitting(true)
    try {
      const { data, errors } = await client.models.Post.create({
        board: boardValue,
        title,
        body,
        ...(boardValue === 'GENERAL' ? { category: postCategory } : {}),
        ...(boardValue === 'HOUSING' && housingType
          ? {
              category: housingType,
              dormBuilding,
              ...(housingType === 'SUBLEASE'
                ? {
                    moveInDate: moveInDate || undefined,
                    moveOutDate: moveOutDate || undefined,
                    monthlyRent: monthlyRent ? parseFloat(monthlyRent) : undefined,
                  }
                : {}),
            }
          : {}),
        ...(boardValue === 'CLASSES' && courseCode ? { courseCode } : {}),
        ...(boardValue === 'EVENTS'
          ? {
              eventDate,
              eventStartTime,
              eventEndTime: eventEndTime || undefined,
              eventLocation: eventLocation || undefined,
              externalLink: externalLink || undefined,
              tags: tags.length ? tags : undefined,
            }
          : {}),
      })
      if (errors?.length || !data) throw new Error('Post.create failed')
      queryClient.setQueryData<Post[]>(['posts', boardValue], (prev) => [data, ...(prev ?? [])])
      resetComposer()
    } catch {
      showToast({ message: t('community.postFailed'), variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))
  }

  if (!validBoard) {
    return (
      <Page>
        <BackLink to="/community">{t('community.back')}</BackLink>
        <CommunityEmptyState message={t('community.notFound')} />
      </Page>
    )
  }

  const boardColor = category.community[boardId]

  const visiblePosts = posts.filter((post) => {
    if (boardValue === 'GENERAL' && generalFilter !== 'ALL' && post.category !== generalFilter) return false
    if (boardValue === 'CLASSES' && courseFilter.trim()) {
      if (!post.courseCode?.toUpperCase().includes(courseFilter.trim().toUpperCase())) return false
    }
    if (boardValue === 'EVENTS') {
      if (freeFoodOnly && !post.tags?.includes('FREE_FOOD')) return false
      if (!showPastEvents && post.eventDate && post.eventDate < todayIso()) return false
    }
    return true
  })

  const calendarMilestones = boardValue === 'EVENTS' ? upcomingMilestones() : []

  return (
    <Page>
      <BackLink to="/community">{t('community.back')}</BackLink>
      <S.TitleRow>
        <S.TitleIconBadge $color={boardColor}>
          <FontAwesomeIcon icon={BOARD_ICONS[boardId]} />
        </S.TitleIconBadge>
        <PageTitle>{t(`community.boards.${boardId}`)}</PageTitle>
      </S.TitleRow>

      {boardValue === 'HOUSING' && (
        <S.ExternalLinkRow>
          <S.ExternalLinkButton
            type="button"
            $color={boardColor}
            onClick={() => window.open('https://housing.uga.edu', '_blank', 'noopener,noreferrer')}
          >
            <FontAwesomeIcon icon={faHouseChimney} />
            {t('community.housing.openHousingSite')}
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
          </S.ExternalLinkButton>
          <S.ExternalLinkButton
            type="button"
            $color={boardColor}
            onClick={() =>
              window.open('https://uga.starrezhousing.com/StarRezPortalX/Login', '_blank', 'noopener,noreferrer')
            }
          >
            {t('community.housing.openStarRez')}
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
          </S.ExternalLinkButton>
          <S.ExternalNotice>{t('community.housing.externalNotice')}</S.ExternalNotice>
        </S.ExternalLinkRow>
      )}

      {boardValue === 'EVENTS' && (
        <>
          <S.ExternalLinkRow>
            <S.ExternalLinkButton
              type="button"
              $color={boardColor}
              onClick={() => window.open('https://app.joinhandshake.com/', '_blank', 'noopener,noreferrer')}
            >
              {t('community.events.openHandshake')}
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
            </S.ExternalLinkButton>
          </S.ExternalLinkRow>
          {calendarMilestones.length > 0 && (
            <S.CalendarStrip>
              {calendarMilestones.map((milestone) => (
                <span key={milestone.labelKey}>
                  {t(`community.events.calendar.${milestone.labelKey}`)} · {milestone.date}
                </span>
              ))}
            </S.CalendarStrip>
          )}
        </>
      )}

      <S.Form onSubmit={handleSubmit} $color={boardColor}>
        <S.FormHeading>
          <FontAwesomeIcon icon={faPen} />
          {t('community.newPost')}
        </S.FormHeading>
        <Input placeholder={t('community.titlePlaceholder')} value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          placeholder={t('community.bodyPlaceholder')}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        {boardValue === 'GENERAL' && (
          <SegmentedControl
            options={GENERAL_CATEGORIES.map((value) => ({ value, label: t(`community.general.category.${toCategoryKey(value)}`) }))}
            value={postCategory}
            onChange={setPostCategory}
          />
        )}

        {boardValue === 'HOUSING' && (
          <>
            <SegmentedControl
              options={[
                { value: '', label: t('community.housing.type.discussion') },
                ...HOUSING_TYPES.map((value) => ({ value, label: t(`community.housing.type.${toCategoryKey(value)}`) })),
              ]}
              value={housingType}
              onChange={(value) => setHousingType(value as typeof housingType)}
            />
            {housingType && (
              <>
                <S.FieldLabel>{t('community.housing.dormBuildingLabel')}</S.FieldLabel>
                <BuildingAutocomplete
                  value={dormBuilding}
                  onChange={setDormBuilding}
                  buildingNames={buildings.filter((b) => b.buildingUse === 'Housing').map((b) => b.name)}
                  placeholder={t('community.housing.dormBuildingPlaceholder')}
                  ariaLabel={t('community.housing.dormBuildingLabel')}
                />
              </>
            )}
            {housingType === 'SUBLEASE' && (
              <S.FieldRow>
                <div>
                  <S.FieldLabel>{t('community.housing.moveInDateLabel')}</S.FieldLabel>
                  <Input
                    type="date"
                    aria-label={t('community.housing.moveInDateLabel')}
                    value={moveInDate}
                    onChange={(event) => setMoveInDate(event.target.value)}
                  />
                </div>
                <div>
                  <S.FieldLabel>{t('community.housing.moveOutDateLabel')}</S.FieldLabel>
                  <Input
                    type="date"
                    aria-label={t('community.housing.moveOutDateLabel')}
                    value={moveOutDate}
                    onChange={(event) => setMoveOutDate(event.target.value)}
                  />
                </div>
                <div>
                  <S.FieldLabel>{t('community.housing.monthlyRentLabel')}</S.FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    aria-label={t('community.housing.monthlyRentLabel')}
                    value={monthlyRent}
                    onChange={(event) => setMonthlyRent(event.target.value)}
                  />
                </div>
              </S.FieldRow>
            )}
          </>
        )}

        {boardValue === 'CLASSES' && (
          <>
            <S.FieldLabel>{t('community.classes.attachCourse')}</S.FieldLabel>
            <CourseCodeField value={courseCode} onChange={setCourseCode} />
          </>
        )}

        {boardValue === 'EVENTS' && (
          <>
            <S.FieldRow>
              <div>
                <S.FieldLabel>{t('community.events.dateLabel')}</S.FieldLabel>
                <Input
                  type="date"
                  aria-label={t('community.events.dateLabel')}
                  min={todayIso()}
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </div>
              <div>
                <S.FieldLabel>{t('community.events.startTimeLabel')}</S.FieldLabel>
                <Input
                  type="time"
                  aria-label={t('community.events.startTimeLabel')}
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                />
              </div>
              <div>
                <S.FieldLabel>{t('community.events.endTimeLabel')}</S.FieldLabel>
                <Input
                  type="time"
                  aria-label={t('community.events.endTimeLabel')}
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
                />
              </div>
            </S.FieldRow>
            <S.FieldLabel>{t('community.events.locationLabel')}</S.FieldLabel>
            <BuildingAutocomplete
              value={eventLocation}
              onChange={setEventLocation}
              buildingNames={buildings.map((b) => b.name)}
              placeholder={t('community.events.locationLabel')}
              ariaLabel={t('community.events.locationLabel')}
            />
            <Input
              type="url"
              placeholder={t('community.events.externalLinkPlaceholder')}
              value={externalLink}
              onChange={(event) => setExternalLink(event.target.value)}
            />
            <S.ChipRow>
              {EVENT_TAGS.map((tag) => (
                <S.Chip
                  key={tag}
                  type="button"
                  $active={tags.includes(tag)}
                  $color={tag === 'FREE_FOOD' ? category.eventTag.freeFood : boardColor}
                  onClick={() => toggleTag(tag)}
                >
                  {tag === 'FREE_FOOD' ? '🍕 ' : ''}
                  {t(`community.events.tags.${toCategoryKey(tag)}`)}
                </S.Chip>
              ))}
            </S.ChipRow>
          </>
        )}

        {validationError && <S.FieldError>{t('community.postValidation')}</S.FieldError>}
        <Button type="submit" loading={submitting}>
          {t('community.post')}
        </Button>
      </S.Form>

      {boardValue === 'GENERAL' && (
        <S.ChipRow>
          {(['ALL', ...GENERAL_CATEGORIES] as const).map((value) => (
            <S.Chip
              key={value}
              type="button"
              $active={generalFilter === value}
              $color={GENERAL_DOT_COLOR[value] ?? boardColor}
              onClick={() => setGeneralFilter(value)}
            >
              {t(`community.general.category.${toCategoryKey(value)}`)}
            </S.Chip>
          ))}
        </S.ChipRow>
      )}

      {boardValue === 'CLASSES' && (
        <Input
          placeholder={t('community.classes.filterPlaceholder')}
          aria-label={t('community.classes.filterByCourse')}
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
        />
      )}

      {boardValue === 'EVENTS' && (
        <S.ChipRow>
          <S.Chip
            type="button"
            $active={freeFoodOnly}
            $color={category.eventTag.freeFood}
            onClick={() => setFreeFoodOnly((prev) => !prev)}
          >
            {t('community.events.freeFoodFilter')}
          </S.Chip>
          <S.Chip type="button" $active={showPastEvents} $color={boardColor} onClick={() => setShowPastEvents((prev) => !prev)}>
            {t('community.events.showPast')}
          </S.Chip>
        </S.ChipRow>
      )}

      {isLoading ? (
        <S.PostList>
          {[0, 1, 2].map((i) => (
            <S.SkeletonCard key={i}>
              <Skeleton height="15px" width="55%" />
              <Skeleton height="14px" width="90%" />
            </S.SkeletonCard>
          ))}
        </S.PostList>
      ) : isError ? (
        <CommunityEmptyState
          message={t('community.loadError')}
          action={{ label: t('community.retry'), onClick: () => refetch() }}
        />
      ) : visiblePosts.length === 0 ? (
        <CommunityEmptyState message={t('community.empty')} />
      ) : (
        <S.PostList>
          {visiblePosts.map((post) => (
            <S.PostCardRow key={post.id}>
              <S.PostCard to={`/community/${boardId}/${post.id}`} $color={boardColor}>
                <S.PostTitle>{post.title}</S.PostTitle>
                <S.PostBody>{post.body}</S.PostBody>
                <S.PostMetaRow>
                  {post.category && boardValue === 'GENERAL' && (
                    <S.MetaChip $dot={GENERAL_DOT_COLOR[post.category]}>
                      {t(`community.general.category.${toCategoryKey(post.category)}`)}
                    </S.MetaChip>
                  )}
                  {post.category && boardValue === 'HOUSING' && (
                    <S.MetaChip $dot={boardColor}>{t(`community.housing.type.${toCategoryKey(post.category)}`)}</S.MetaChip>
                  )}
                  {post.dormBuilding && (
                    <S.MetaChip>
                      <FontAwesomeIcon icon={faLocationDot} /> {post.dormBuilding}
                    </S.MetaChip>
                  )}
                  {post.courseCode && (
                    <S.CourseChip
                      type="button"
                      $color={boardColor}
                      onClick={(event) => {
                        event.preventDefault()
                        setLookupCourseCode(post.courseCode!)
                      }}
                    >
                      {post.courseCode}
                    </S.CourseChip>
                  )}
                  {post.eventDate && (
                    <S.MetaChip $dot={boardColor}>
                      <FontAwesomeIcon icon={faCalendarDay} /> {post.eventDate} {post.eventStartTime}
                    </S.MetaChip>
                  )}
                  {post.eventLocation && (
                    <S.MetaChip>
                      <FontAwesomeIcon icon={faLocationDot} /> {post.eventLocation}
                    </S.MetaChip>
                  )}
                  {post.tags?.map(
                    (tag) =>
                      tag && (
                        <S.MetaChip key={tag} $dot={tag === 'FREE_FOOD' ? category.eventTag.freeFood : undefined}>
                          {tag === 'FREE_FOOD' ? '🍕 ' : ''}
                          {t(`community.events.tags.${toCategoryKey(tag)}`)}
                        </S.MetaChip>
                      ),
                  )}
                </S.PostMetaRow>
              </S.PostCard>
              {boardValue === 'GENERAL' && (
                <S.ScrapButton
                  type="button"
                  $active={isFavorite(post.id)}
                  aria-label={t(isFavorite(post.id) ? 'community.general.scrapped' : 'community.general.scrap')}
                  aria-pressed={isFavorite(post.id)}
                  onClick={() => toggleFavorite(post.id)}
                >
                  <FontAwesomeIcon icon={faBookmark} />
                </S.ScrapButton>
              )}
            </S.PostCardRow>
          ))}
        </S.PostList>
      )}

      {lookupCourseCode && <ClassLookupModal courseCode={lookupCourseCode} onClose={() => setLookupCourseCode(null)} />}
    </Page>
  )
}

// "FREE_TALK" -> "freeTalk", "DORM_REVIEW" -> "dormReview" — matches this file's i18n
// key casing convention (camelCase leaves, UPPER_SNAKE enum values on the wire).
function toCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}
