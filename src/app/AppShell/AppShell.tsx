import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faComments,
  faCalendarDays,
  faMapLocationDot,
  faUtensils,
  faGear,
} from '@fortawesome/free-solid-svg-icons'
import { Logo } from '../../design-system/Brand/Logo'
import { S } from './AppShell.style'

const FULL_BLEED_ROUTES = ['/map', '/schedule', '/friends']

const NAV_ITEMS = [
  { to: '/community', icon: faComments, labelKey: 'nav.community' },
  { to: '/schedule', icon: faCalendarDays, labelKey: 'nav.schedule' },
  { to: '/map', icon: faMapLocationDot, labelKey: 'nav.map' },
  { to: '/dining', icon: faUtensils, labelKey: 'nav.dining' },
  { to: '/settings', icon: faGear, labelKey: 'nav.settings' },
] as const

function NavLinks() {
  const { t } = useTranslation()
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <S.NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {({ isActive }) => (
            <>
              <S.NavIconWrap $active={isActive}>
                <FontAwesomeIcon icon={item.icon} />
              </S.NavIconWrap>
              <span>{t(item.labelKey)}</span>
            </>
          )}
        </S.NavLink>
      ))}
    </>
  )
}

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation()
  const fullBleed = FULL_BLEED_ROUTES.some((route) => pathname.startsWith(route))

  return (
    <S.Shell>
      <S.Sidebar>
        <S.Brand>
          <Logo size={28} />
          <S.BrandWordmark>DawgHub</S.BrandWordmark>
        </S.Brand>
        <NavLinks />
      </S.Sidebar>

      <S.Main $fullBleed={fullBleed}>{children}</S.Main>

      <S.BottomNav>
        <NavLinks />
      </S.BottomNav>
    </S.Shell>
  )
}
