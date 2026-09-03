import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BoardPage } from './BoardPage'

let createImpl: (vars: Record<string, unknown>) => Promise<{ data: unknown; errors?: unknown[] }>

vi.mock('../../lib/amplifyClient', () => ({
  client: {
    models: {
      Post: {
        list: vi.fn(async () => ({ data: [] })),
        create: vi.fn((vars) => createImpl(vars)),
      },
    },
  },
}))

function renderBoardPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/community/:boardId" element={<BoardPage />} />
    </Routes>,
    { route: '/community/general' },
  )
}

describe('BoardPage', () => {
  beforeEach(() => {
    createImpl = async (vars) => ({ data: { id: 'p1', ...vars } })
  })

  it('shows a not-found message instead of a blank page for an invalid board', () => {
    renderWithProviders(
      <Routes>
        <Route path="/community/:boardId" element={<BoardPage />} />
      </Routes>,
      { route: '/community/not-a-real-board' },
    )
    expect(screen.getByText("This page couldn't be found.")).toBeInTheDocument()
  })

  it('shows inline validation instead of silently ignoring an empty submit', async () => {
    renderBoardPage()
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByText('Please fill in both a title and a message.')).toBeInTheDocument()
  })

  it('clears the form on a successful post', async () => {
    renderBoardPage()
    await userEvent.type(screen.getByPlaceholderText('Title'), 'My title')
    await userEvent.type(screen.getByPlaceholderText("What's on your mind?"), 'My body')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))

    expect(await screen.findByText('My title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Title')).toHaveValue('')
    expect(screen.getByPlaceholderText("What's on your mind?")).toHaveValue('')
  })

  it('keeps the form filled in and shows a toast when the post fails', async () => {
    createImpl = async () => ({ data: null, errors: [{ message: 'boom' }] as unknown[] })
    renderBoardPage()
    await userEvent.type(screen.getByPlaceholderText('Title'), 'My title')
    await userEvent.type(screen.getByPlaceholderText("What's on your mind?"), 'My body')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))

    expect(await screen.findByText("Couldn't post — try again.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Title')).toHaveValue('My title')
  })
})
