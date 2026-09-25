import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '@/pages/admin/Dashboard'

const data = {
  asOf: new Date('2026-09-23T18:00:00Z').getTime(),
  inquiries: [
    { id: 'a', full_name: 'Alex', status: 'new', last_contacted_at: null, wedding_date_estimate: 'Summer 2027', tour_at: null },
    { id: 'b', full_name: 'Bailey', status: 'tour_scheduled', last_contacted_at: '2026-09-20T12:00:00Z', wedding_date_estimate: '2027', tour_at: '2026-09-24T18:00:00Z' },
  ],
  bookings: [{ id: 'booking-1', start_date: '2026-10-01', end_date: '2026-10-04', guest_camping_count: 45 }],
  blocks: [{ id: 'hold-1', kind: 'hold', label: 'Possible weekend', expires_at: '2026-09-24T10:00:00Z' }],
  workspaces: [], tasks: [], payments: [{ id: 'payment-1', booking_id: 'booking-1', label: 'Deposit', due_on: '2026-09-01', amount_due_cents: 10000, paid_cents: 0 }],
  operations: { camp: [], contacts: [], profile: null, checks: [{ area: 'readiness', completed_at: null }] },
}
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data, isLoading: false, error: null }) }))

describe('Dashboard attention', () => {
  it('shows actionable records and missing details for the next wedding', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText(/Possible weekend/)).toBeInTheDocument()
    expect(screen.getByText(/Signed contract not recorded/)).toBeInTheDocument()
    expect(screen.getByText(/Camping arrival details missing/)).toBeInTheDocument()
    expect(screen.getByText(/Deposit/)).toBeInTheDocument()
    expect(screen.getByText(/Nightly camping register empty/)).toBeInTheDocument()
    expect(screen.getByText(/Property readiness checks open/)).toBeInTheDocument()
  })
})
