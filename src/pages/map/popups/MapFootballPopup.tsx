import { useTranslation } from 'react-i18next'
import type { FootballGame } from '../../../lib/footballSchedule'
import { MapDirectionsButton } from './MapDirectionsButton'
import { S } from './MapFootballPopup.style'

type MapFootballPopupProps = {
  game: FootballGame | null
  onDirections: () => void
}

export function MapFootballPopup({ game, onDirections }: MapFootballPopupProps) {
  const { t, i18n } = useTranslation()

  return (
    <S.Wrapper>
      <S.Name>{t('map.football.stadiumName')}</S.Name>
      {!game && <S.Sub>{t('map.football.noUpcomingGame')}</S.Sub>}
      {game && (
        <>
          <S.Opponent>
            {t(game.isHome ? 'map.football.vsOpponent' : 'map.football.atOpponent', {
              opponent: game.opponent,
            })}
          </S.Opponent>
          {game.gameState === 'live' ? (
            <S.LiveRow>
              <S.LiveBadge>{t('map.football.live')}</S.LiveBadge>
              <S.Score>
                {game.teamScore ?? 0} - {game.opponentScore ?? 0}
              </S.Score>
              <S.Sub>
                {game.period} {game.clock}
              </S.Sub>
            </S.LiveRow>
          ) : (
            <S.Sub>
              {new Intl.DateTimeFormat(i18n.language, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(game.startTimeEpochMs)}
            </S.Sub>
          )}
        </>
      )}
      <MapDirectionsButton onClick={onDirections} />
    </S.Wrapper>
  )
}
