import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InquiriesPage from '@/pages/admin/InquiriesPage'

vi.mock('@/hooks/useInquiries', () => {
  return {
    useInquiries: () => ({ data: [], isLoading: false, error: null }),
  }
})

describe('InquiriesPage', () => {
  it('shows empty state with button', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <InquiriesPage />
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: /Inquiries/i, level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/No inquiries yet/i)[0]).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /new inquiry/i })[0]).toBeInTheDocument()
  })
})
