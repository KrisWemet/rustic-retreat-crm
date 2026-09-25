import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RequireAuth from '@/components/RequireAuth'

const getUser = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => getUser(), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}))

describe('RequireAuth', () => {
  it('does not render admin content for an authenticated client', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'client' } }, error: null })
    rpc.mockResolvedValue({ data: false, error: null })
    render(<MemoryRouter><RequireAuth><div>Private admin content</div></RequireAuth></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('does not have CRM admin access')
    expect(screen.queryByText('Private admin content')).not.toBeInTheDocument()
  })
})
