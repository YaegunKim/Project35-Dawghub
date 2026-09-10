import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { PostDetailPage } from './PostDetailPage'

const mockPost = { id: 'p1', title: 'My title', body: 'My body', board: 'GENERAL' }
const mockComments = [
  { id: 'c1', postId: 'p1', body: 'first comment' },
  { id: 'c2', postId: 'p1', body: 'second comment' },
]

let postLikeGetImpl: () => Promise<{ data: unknown }>

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ userId: 'sub-1', username: 'me' })),
}))

vi.mock('../../lib/amplifyClient', () => ({
  client: {
    models: {
      Post: { get: vi.fn(async () => ({ data: mockPost })) },
      Comment: {
        list: vi.fn(async () => ({ data: mockComments })),
        create: vi.fn(async (vars) => ({ data: { id: 'c3', ...vars } })),
      },
      PostLike: {
        get: vi.fn(() => postLikeGetImpl()),
        list: vi.fn(async () => ({ data: [] })),
        create: vi.fn(async () => ({ data: { id: 'p1_sub-1', postId: 'p1' } })),
        delete: vi.fn(async () => ({ data: null })),
      },
    },
    queries: {
      // Everytime-style anonymous numbering: c1's commenter is the 1st distinct owner
      // seen, c2's is the 2nd — this is exactly the shape amplify/data/get-thread-anon-
      // labels/handler.ts computes server-side.
      getThreadAnonLabels: vi.fn(async () => ({
        data: {
          labels: [
            { commentId: 'c1', anonNumber: 1 },
            { commentId: 'c2', anonNumber: 2 },
          ],
        },
      })),
    },
  },
}))

function renderPostDetailPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/community/:boardId/:postId" element={<PostDetailPage />} />
    </Routes>,
    { route: '/community/general/p1' },
  )
}

describe('PostDetailPage', () => {
  beforeEach(() => {
    postLikeGetImpl = async () => ({ data: null })
  })

  it('never shows a real name — the post author is always plain "Anonymous"', async () => {
    renderPostDetailPage()
    expect(await screen.findByText('My title')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('numbers each distinct commenter per-thread ("Anonymous 1", "Anonymous 2", ...)', async () => {
    renderPostDetailPage()
    expect(await screen.findByText('Anonymous 1')).toBeInTheDocument()
    expect(screen.getByText('Anonymous 2')).toBeInTheDocument()
  })

  it('toggles the like button optimistically and reflects the new count', async () => {
    renderPostDetailPage()
    const likeButton = await screen.findByRole('button', { name: /Like/ })
    expect(likeButton).toHaveTextContent('(0)')

    await userEvent.click(likeButton)
    expect(await screen.findByRole('button', { name: /Like \(1\)/ })).toBeInTheDocument()
  })

  it('rolls back the like and shows a toast if the server call fails', async () => {
    renderPostDetailPage()
    const likeButton = await screen.findByRole('button', { name: /Like/ })

    postLikeGetImpl = () => Promise.reject(new Error('boom'))
    await userEvent.click(likeButton)

    expect(await screen.findByText("Couldn't update your like — try again.")).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Like \(0\)/ })).toBeInTheDocument()
  })
})
