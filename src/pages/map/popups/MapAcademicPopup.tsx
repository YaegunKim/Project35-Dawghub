import { useTranslation } from 'react-i18next'
import { MapDirectionsButton } from './MapDirectionsButton'
import { S } from './MapAcademicPopup.style'

export type MapAcademicClass = {
  courseCode: string
  day: string
  startTime: string
  endTime: string
}

type MapAcademicPopupProps = {
  buildingName: string
  classes: MapAcademicClass[]
  onDirections: () => void
}

export function MapAcademicPopup({ buildingName, classes, onDirections }: MapAcademicPopupProps) {
  const { t } = useTranslation()

  return (
    <S.Wrapper>
      <S.Name>{buildingName}</S.Name>
      {classes.length === 0 ? (
        <S.Empty>{t('map.noClassesHere')}</S.Empty>
      ) : (
        <S.ClassList>
          {classes.map((entry, index) => (
            <S.ClassRow key={`${entry.courseCode}-${index}`}>
              <S.CourseCode>{entry.courseCode}</S.CourseCode>
              <S.ClassTime>
                {entry.day} {entry.startTime}–{entry.endTime}
              </S.ClassTime>
            </S.ClassRow>
          ))}
        </S.ClassList>
      )}
      <MapDirectionsButton onClick={onDirections} />
    </S.Wrapper>
  )
}
