import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { faLocationDot, faRoute } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { DiningHall } from '../../lib/diningHours'
import { buildDiningMapIntent } from '../../lib/dining'
import type { MapLocationState } from '../../lib/mapNavigation'
import { S } from './DiningQuickActions.style'

type DiningQuickActionsProps = {
  hall: DiningHall
}

// Shared by the card list and the detail page — "See Location" pans/zooms the Map tab to the
// hall's building; "Get Directions" does the same but also starts a trip plan from the user's
// current GPS position (see MapPage's mapIntent handling for the receiving end).
export function DiningQuickActions({ hall }: DiningQuickActionsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  async function goToMap(event: MouseEvent<HTMLButtonElement>, type: 'focus' | 'directions') {
    event.stopPropagation()
    const intent = await buildDiningMapIntent(hall, type)
    if (!intent) return
    const state: MapLocationState = { mapIntent: intent }
    navigate('/map', { state })
  }

  return (
    <S.Row>
      <S.ActionButton type="button" onClick={(event) => goToMap(event, 'focus')}>
        <FontAwesomeIcon icon={faLocationDot} />
        {t('dining.seeLocation')}
      </S.ActionButton>
      <S.ActionButton type="button" onClick={(event) => goToMap(event, 'directions')}>
        <FontAwesomeIcon icon={faRoute} />
        {t('dining.getDirections')}
      </S.ActionButton>
    </S.Row>
  )
}
