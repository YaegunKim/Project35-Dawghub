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
const FriendSchedulePage = lazy(() =>
  import('../pages/friends/FriendSchedulePage').then((m) => ({ default: m.FriendSchedulePage })),
)

const MIN_SPLASH_MS = 500

// Playwright's webServer sets this (see playwright.config.ts) to skip the real Cognito login
// screen — E2E specs mock the network boundary (GraphQL responses) instead of hitting AWS, and
// there's no way to reach that boundary through a real sign-in flow in a headless browser.
// `pnpm dev`/`pnpm build` never set this, so the bypass never ships in a real build.
const isE2E = import.meta.env.VITE_E2E === 'true'

function RouteFallback() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton height="24px" width="60%" />
    </div>
  )
}

function AppRoutes({ userEmail, onSignOut }: { userEmail?: string; onSignOut?: () => void }) {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/community" replace />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/:boardId" element={<BoardPage />} />
          <Route path="/community/:boardId/:postId" element={<PostDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/friends/:friendUserId" element={<FriendSchedulePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/dining" element={<DiningPage />} />
          <Route path="/dining/:hallSlug" element={<DiningHallDetailPage />} />
          <Route path="/settings" element={<SettingsPage userEmail={userEmail} onSignOut={onSignOut} />} />
        </Routes>
      </Suspense>
    </AppShell>
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

  if (isE2E) {
    return <AppRoutes userEmail="e2e-test@uga.edu" onSignOut={() => {}} />
  }

  return (
    <Authenticator>
      {({ signOut, user }) => <AppRoutes userEmail={user?.signInDetails?.loginId} onSignOut={signOut} />}
    </Authenticator>
  )
}
