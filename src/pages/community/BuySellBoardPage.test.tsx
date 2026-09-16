import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BuySellBoardPage } from './BuySellBoardPage'

const activeListing = {
  id: 'l1',
  title: 'Calculus textbook',
  description: 'Barely used',
  price: 40,
  category: 'TEXTBOOKS',
  condition: 'GOOD',
  status: 'ACTIVE',
  photoKeys: [],
  sellerEmail: 'seller@uga.edu',
}
const soldListing = { ...activeListing, id: 'l2', title: 'Sold desk lamp', category: 'FURNITURE', status: 'SOLD' }

let createImpl: (vars: Record<string, unknown>) => Promise<{ data: unknown; errors?: unknown[] }>

vi.mock('aws-amplify/auth', () => ({
  fetchUserAttributes: vi.fn(async () => ({ email: 'me@uga.edu' })),
}))

vi.mock('../../lib/amplifyClient', () => ({
  client: {
    models: {
      MarketplaceListing: {
        list: vi.fn(async () => ({ data: [activeListing, soldListing] })),
        create: vi.fn((vars) => createImpl(vars)),
      },
    },
  },
}))

function renderBuySellBoardPage() {
  return renderWithProviders(<BuySellBoardPage />, { route: '/community/buySell' })
}

describe('BuySellBoardPage', () => {
  beforeEach(() => {
    createImpl = async (vars) => ({ data: { id: 'l3', ...vars } })
  })

  it('hides sold listings by default and reveals them via the toggle', async () => {
    renderBuySellBoardPage()
    expect(await screen.findByText('Calculus textbook')).toBeInTheDocument()
    expect(screen.queryByText('Sold desk lamp')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show sold too' }))
    expect(await screen.findByText('Sold desk lamp')).toBeInTheDocument()
  })

  it('filters by category', async () => {
    renderBuySellBoardPage()
    await screen.findByText('Calculus textbook')

    await userEvent.click(screen.getByRole('button', { name: 'Furniture' }))
    expect(screen.queryByText('Calculus textbook')).not.toBeInTheDocument()
  })

  it('rejects a listing with no price instead of silently posting it', async () => {
    renderBuySellBoardPage()
    await userEvent.type(screen.getByPlaceholderText('What are you selling?'), 'Mini fridge')
    await userEvent.type(screen.getByPlaceholderText("Describe the item's condition, size, etc."), 'Works great')
    await userEvent.click(screen.getByRole('button', { name: 'Post listing' }))

    expect(await screen.findByText('Please fill in a title, description, and price.')).toBeInTheDocument()
  })

  it('creates a listing with no photos (photos are optional, ai/SPEC.md §4.4)', async () => {
    renderBuySellBoardPage()
    await userEvent.type(screen.getByPlaceholderText('What are you selling?'), 'Mini fridge')
    await userEvent.type(screen.getByPlaceholderText("Describe the item's condition, size, etc."), 'Works great')
    await userEvent.type(screen.getByPlaceholderText('Price ($)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Post listing' }))

    expect(await screen.findByText('Mini fridge')).toBeInTheDocument()
  })
})
