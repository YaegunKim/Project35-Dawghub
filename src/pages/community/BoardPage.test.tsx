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

  it('defaults a General post to the Free talk category and includes it on create', async () => {
    let submitted: Record<string, unknown> | undefined
    createImpl = async (vars) => {
      submitted = vars
      return { data: { id: 'p1', ...vars } }
    }
    renderBoardPage()
    await userEvent.type(screen.getByPlaceholderText('Title'), 'My title')
    await userEvent.type(screen.getByPlaceholderText("What's on your mind?"), 'My body')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))

    await screen.findByText('My title')
    expect(submitted?.category).toBe('FREE_TALK')
  })

  it('filters the General board by category', async () => {
    createImpl = async (vars) => ({ data: { id: 'p1', ...vars } })
    renderBoardPage()
    await userEvent.type(screen.getByPlaceholderText('Title'), 'A notice')
    await userEvent.type(screen.getByPlaceholderText("What's on your mind?"), 'body')
    // "Notice" appears twice: once as the composer's category segmented control (first in
    // the DOM), once as the filter row below the list — the composer's is the one that
    // picks what this post gets created as.
    await userEvent.click(screen.getAllByRole('button', { name: 'Notice' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    await screen.findByText('A notice')

    // "Q&A" also appears twice (composer segmented control, then the filter row below the
    // list) — index 1 is the filter row's, which only matches QNA-category posts once
    // active, so the just-created NOTICE post should disappear once it's selected.
    await userEvent.click(screen.getAllByRole('button', { name: 'Q&A' })[1])
    expect(screen.queryByText('A notice')).not.toBeInTheDocument()
  })

  it("won't submit an Events post dated before today (native min= constraint on the date field)", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/community/:boardId" element={<BoardPage />} />
      </Routes>,
      { route: '/community/events' },
    )
    await userEvent.type(screen.getByPlaceholderText('Title'), 'Old event')
    await userEvent.type(screen.getByPlaceholderText("What's on your mind?"), 'body')
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2000-01-01')
    await userEvent.type(screen.getByLabelText('Start time'), '10:00')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))

    // The date field's min= (today) blocks the browser's own form submission before this
    // page's JS ever runs — no post should ever appear.
    expect(screen.queryByText('Old event')).not.toBeInTheDocument()
    expect(await screen.findByText('No posts yet. Be the first to post!')).toBeInTheDocument()
  })
})
