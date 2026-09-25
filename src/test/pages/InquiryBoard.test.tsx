import { fireEvent, render, screen } from '@testing-library/react'
import InquiryBoard from '@/pages/admin/InquiryBoard'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'

const base = {
  email: 'alex@example.com', phone: null, partner_name: null,
  preferred_contact: null, preferred_contact_email: null, estimated_guests: null, preferred_tour_dates: null,
  inquiry_type: null, landing_source: null, last_contacted_at: null,
  next_follow_up_at: null, tour_at: null, tour_outcome: null, lost_reason: null,
  status_changed_at: '2026-09-20T12:00:00Z', external_submission_id: null,
  source: 'Website', notes: null, created_at: '2026-09-20T12:00:00Z',
} satisfies Partial<Inquiry>
const leads: Inquiry[] = [
  { ...base, id: 'lead-1', full_name: 'Alex', status: 'new', wedding_date_estimate: 'Summer 2027', next_follow_up_at: '2026-09-01T12:00:00Z' },
  { ...base, id: 'lead-2', full_name: 'Bailey', status: 'contract_sent', wedding_date_estimate: 'June 2028' },
  { ...base, id: 'lead-3', full_name: 'Casey', status: 'booking_confirmed', wedding_date_estimate: '2027-08-14' },
]
vi.mock('@/hooks/useInquiries', () => ({ useInquiries: () => ({ data: leads, isLoading: false, error: null }) }))
vi.mock('@/hooks/useUpdateInquiry', () => ({ useUpdateInquiry: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@/components/ui/toast-context', () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock('@/components/CreateInquiryModal', () => ({ default: () => null }))
vi.mock('@/components/InquiryDetailModal', () => ({ default: () => null }))
vi.mock('@/components/ConvertToBookingModal', () => ({ default: () => null }))

describe('InquiryBoard', () => {
  it('keeps flexible dates intact and separates confirmed bookings from open leads', () => {
    render(<InquiryBoard />)
    expect(screen.getByText('Contract Sent')).toBeInTheDocument()
    expect(screen.getByText('Summer 2027')).toBeInTheDocument()
    expect(screen.queryByText('Casey')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Booked 1/ }))
    expect(screen.getByText('Casey')).toBeInTheDocument()
    expect(screen.queryByText('Alex')).not.toBeInTheDocument()
  })
  it('shows only due follow-ups in the due view', () => {
    render(<InquiryBoard />)
    fireEvent.click(screen.getByRole('button', { name: /Follow-up due 1/ }))
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.queryByText('Bailey')).not.toBeInTheDocument()
  })
})
