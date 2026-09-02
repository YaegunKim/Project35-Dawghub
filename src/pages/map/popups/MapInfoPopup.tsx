import { useTranslation } from 'react-i18next'
import { MapDirectionsButton } from './MapDirectionsButton'
import { S } from './MapInfoPopup.style'

type MapInfoPopupProps = {
  name: string
  sub?: string
  hours?: string | null
  onDirections: () => void
}

export function MapInfoPopup({ name, sub, hours, onDirections }: MapInfoPopupProps) {
  const { t } = useTranslation()

  return (
    <S.Wrapper>
      <S.Name>{name}</S.Name>
      {sub && <S.Sub>{sub}</S.Sub>}
      {hours && <S.Hours>{t('map.hoursToday', { hours })}</S.Hours>}
      <MapDirectionsButton onClick={onDirections} />
    </S.Wrapper>
  )
}
