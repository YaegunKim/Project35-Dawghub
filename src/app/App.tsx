import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import { AppShell } from './AppShell/AppShell'
import { Skeleton } from '../design-system/Skeleton/Skeleton'

const CommunityPage = lazy(() => import('../pages/community/CommunityPage').then((m) => ({ default: m.CommunityPage })))
const BoardPage = lazy(() => import('../pages/community/BoardPage').then((m) => ({ default: m.BoardPage })))
const PostDetailPage = lazy(() => import('../pages/community/PostDetailPage').then((m) => ({ default: m.PostDetailPage })))
const SchedulePage = lazy(() => import('../pages/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })))
const MapPage = lazy(() => import('../pages/map/MapPage').then((m) => ({ default: m.MapPage })))
const DiningPage = lazy(() => import('../pages/dining/DiningPage').then((m) => ({ default: m.DiningPage })))
const DiningHallDetailPage = lazy(() =>
  import('../pages/dining/DiningHallDetailPage').then((m) => ({ default: m.DiningHallDetailPage })),
)
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const MIN_SPLASH_MS = 500

function RouteFallback() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton height="24px" width="60%" />
    </div>
  )
}

export function App() {
  useEffect(() => {
    const elapsed = performance.now()
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed)
    const timer = setTimeout(() => {
      const splash = document.getElementById('splash')
      if (!splash) return
      splash.classList.add('splash-hide')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }, remaining)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/community" replace />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/:boardId" element={<BoardPage />} />
              <Route path="/community/:boardId/:postId" element={<PostDetailPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/dining" element={<DiningPage />} />
              <Route path="/dining/:hallSlug" element={<DiningHallDetailPage />} />
              <Route
                path="/settings"
                element={<SettingsPage userEmail={user?.signInDetails?.loginId} onSignOut={signOut} />}
              />
            </Routes>
          </Suspense>
        </AppShell>
      )}
    </Authenticator>
  )
}
