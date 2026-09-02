import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRoute } from '@fortawesome/free-solid-svg-icons'
import { S } from './MapDirectionsButton.style'

type MapDirectionsButtonProps = {
  onClick: () => void
}

// Shared across every non-bus popup (library/dining/gym/dorm/academic) so a "Directions"
// action only needs styling once — bus stop/route popups intentionally don't get this.
export function MapDirectionsButton({ onClick }: MapDirectionsButtonProps) {
  const { t } = useTranslation()
  return (
    <S.Button type="button" onClick={onClick}>
      <FontAwesomeIcon icon={faRoute} />
      {t('map.directions.button')}
    </S.Button>
  )
}
