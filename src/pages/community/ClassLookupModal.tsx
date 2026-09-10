import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Modal } from '../../design-system/Modal/Modal'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { client } from '../../lib/amplifyClient'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './ClassLookupModal.style'

type UgaClassMeeting = NonNullable<Schema['UgaClassMeeting']['type']>
type ProfessorRating = NonNullable<Schema['ProfessorRating']['type']>
type CourseCatalogEntry = NonNullable<Schema['CourseCatalogEntry']['type']>

type Props = {
  courseCode: string
  onClose: () => void
}

function professorKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`
}

// RateMyProfessors reports avgRating as 0 (not null) for professors with zero reviews —
// same guard as SchedulePage's hasRating, treat that as "no rating" rather than a literal 0.
function hasRating(rating: ProfessorRating | undefined): rating is ProfessorRating & { rating: number } {
  return typeof rating?.rating === 'number' && (rating.numRatings ?? 0) > 0
}

// Read-only lookup for a course code attached to a Classes-board post: this term's
// sections (reg.uga.edu), each instructor's RateMyProfessor rating, and the catalog
// description (bulletin.uga.edu) — all three already exist as backend queries (the first
// two power the Schedule tab's search flow). This modal deliberately does not offer
// "add to my schedule" — that stays the Schedule tab's job (ai/SPEC.md §3.2) — only a
// link across to it.
export function ClassLookupModal({ courseCode, onClose }: Props) {
  const { t } = useTranslation()
  const [meetings, setMeetings] = useState<UgaClassMeeting[] | null>(null)
  const [ratings, setRatings] = useState<Record<string, ProfessorRating>>({})
  const [catalog, setCatalog] = useState<CourseCatalogEntry | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    client.queries
      .searchUgaClasses({ query: courseCode })
      .then(({ data }) => {
        if (cancelled) return
        const matches = (data ?? []).filter(
          (meeting): meeting is UgaClassMeeting => !!meeting && meeting.courseCode === courseCode,
        )
        setMeetings(matches)

        const seen = new Set<string>()
        for (const meeting of matches) {
          if (!meeting.instructorFirstName || !meeting.instructorLastName) continue
          const key = professorKey(meeting.instructorFirstName, meeting.instructorLastName)
          if (seen.has(key)) continue
          seen.add(key)
          client.queries
            .getProfessorRating({ firstName: meeting.instructorFirstName, lastName: meeting.instructorLastName })
            .then(({ data: rating }) => {
              if (!cancelled && rating) setRatings((prev) => ({ ...prev, [key]: rating }))
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) setMeetings([])
      })

    client.queries
      .getCourseCatalogEntry({ courseCode })
      .then(({ data }) => {
        if (!cancelled) setCatalog(data?.found ? data : null)
      })
      .catch(() => {
        if (!cancelled) setCatalog(null)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [courseCode])

  return (
    <Modal onClose={onClose} maxWidth="440px">
      <S.ModalHeader>
        <S.ModalTitle>{courseCode}</S.ModalTitle>
        <IconButton aria-label={t('schedule.close')} onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </IconButton>
      </S.ModalHeader>
      <S.ModalBody>
        <S.Section>
          <S.SectionTitle>{t('community.classes.sectionsHeading')}</S.SectionTitle>
          {meetings === null ? (
            <Skeleton height="40px" />
          ) : meetings.length === 0 ? (
            <EmptyState>{t('community.classes.noSections')}</EmptyState>
          ) : (
            meetings.map((meeting) => {
              const key = meeting.instructorFirstName && meeting.instructorLastName
                ? professorKey(meeting.instructorFirstName, meeting.instructorLastName)
                : ''
              const rating = ratings[key]
              return (
                <S.SectionRow key={meeting.crn}>
                  <S.SectionMeta>
                    {[meeting.days?.join(''), meeting.startTime && meeting.endTime ? `${meeting.startTime}-${meeting.endTime}` : null, meeting.building]
                      .filter(Boolean)
                      .join(' · ')}
                  </S.SectionMeta>
                  <S.InstructorRow>
                    <span>{meeting.instructor}</span>
                    {hasRating(rating) && (
                      <S.RatingBadge>
                        {rating.rating.toFixed(1)} · {t('schedule.ratingMeta', { difficulty: rating.difficulty?.toFixed(1), count: rating.numRatings })}
                        {typeof rating.wouldTakeAgainPercent === 'number' &&
                          t('schedule.ratingRetake', { percent: Math.round(rating.wouldTakeAgainPercent) })}
                      </S.RatingBadge>
                    )}
                  </S.InstructorRow>
                </S.SectionRow>
              )
            })
          )}
        </S.Section>

        <S.Section>
          <S.SectionTitle>{t('community.classes.catalogHeading')}</S.SectionTitle>
          {catalogLoading ? (
            <Skeleton height="40px" />
          ) : !catalog ? (
            <EmptyState>{t('community.classes.noCatalogEntry')}</EmptyState>
          ) : (
            <>
              {catalog.description && <S.CatalogValue>{catalog.description}</S.CatalogValue>}
              {catalog.creditHours && (
                <S.CatalogRow>
                  <S.CatalogLabel>{t('community.classes.creditHours')}</S.CatalogLabel>
                  <S.CatalogValue>{catalog.creditHours}</S.CatalogValue>
                </S.CatalogRow>
              )}
              {catalog.prerequisites && (
                <S.CatalogRow>
                  <S.CatalogLabel>{t('community.classes.prerequisites')}</S.CatalogLabel>
                  <S.CatalogValue>{catalog.prerequisites}</S.CatalogValue>
                </S.CatalogRow>
              )}
            </>
          )}
        </S.Section>

        <S.ScheduleLink to="/schedule">{t('community.classes.goToSchedule')}</S.ScheduleLink>
      </S.ModalBody>
    </Modal>
  )
}
