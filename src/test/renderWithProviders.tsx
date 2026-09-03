import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { ToastProvider } from '../design-system/Toast/Toast'

type RenderWithProvidersOptions = RenderOptions & {
  route?: string
  queryClient?: QueryClient
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
}

// Standing replacement for the disposable src/devharness/harness.tsx pattern previous
// sessions used — wraps a component the same way main.tsx does (router + query cache),
// minus Amplify/Auth, so pages/components can be mounted in isolation with seeded data.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', queryClient = createTestQueryClient(), ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
