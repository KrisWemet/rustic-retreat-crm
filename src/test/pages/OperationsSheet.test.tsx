import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OperationsSheet from '@/pages/admin/OperationsSheet'

const data = {
  booking: { id: 'booking', start_date: '2027-06-11', end_date: '2027-06-13', package: 'three_day', package_terms: { name: 'Classic 3-Day Weekend' }, guest_reception_count: 80, guest_camping_count: 4 },
  inquiry: { full_name: 'Alex', partner_name: 'Bailey' },
  operations: {
    camp: [{ id: 'camp', group_name: 'Family RV', kind: 'rv', occupants: 4, arrival_on: '2027-06-11', departure_on: '2027-06-13', unit_size_ft: 30, site_label: 'Meadow', contact_name: 'Casey', contact_phone: '555-1234', notes: null }],
    cabin: null, vendors: [], contacts: [{ id: 'contact', name: 'Chris', role: 'Venue owner', phone: '555-4567', notes: null }],
    profile: { weather_forecast: null, weather_plan: 'Use covered area', weather_decision: null, weather_decided_at: null, checkout_completed_at: null, checkout_notes: null },
    checks: [{ id: 'check', area: 'readiness', label: 'Water supply checked', completed_at: null, owner: 'Chris', notes: null }],
    photos: [],
  },
}
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data, isLoading: false, error: null }) }))

it('prints real camping, weather, contact, and checklist details without financial data', () => {
  render(<MemoryRouter initialEntries={['/admin/bookings/booking/operations-sheet']}><Routes><Route path="/admin/bookings/:id/operations-sheet" element={<OperationsSheet />} /></Routes></MemoryRouter>)
  expect(screen.getByText('Alex & Bailey')).toBeInTheDocument()
  expect(screen.getByText(/Family RV/)).toBeInTheDocument()
  expect(screen.getByText(/Use covered area/)).toBeInTheDocument()
  expect(screen.getByText(/555-4567/)).toBeInTheDocument()
  expect(screen.getByText(/Water supply checked/)).toBeInTheDocument()
  expect(screen.queryByText(/Damage deposit/)).not.toBeInTheDocument()
})
