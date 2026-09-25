import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequirePortal from '@/components/RequirePortal'

const getUser = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  auth: { getUser: () => getUser(), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  rpc: (...args: unknown[]) => rpc(...args),
} }))

it('keeps the portal closed to guests and allows a signed-in client', async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  render(<MemoryRouter initialEntries={['/portal']}><Routes><Route path="/" element={<div>Sign in page</div>} /><Route path="/portal" element={<RequirePortal><div>Wedding portal</div></RequirePortal>} /></Routes></MemoryRouter>)
  expect(await screen.findByText('Sign in page')).toBeInTheDocument()
  expect(screen.queryByText('Wedding portal')).not.toBeInTheDocument()
})

it('shows a signed-in client their portal', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'client' } }, error: null })
  rpc.mockResolvedValue({ data: 'client', error: null })
  render(<MemoryRouter><RequirePortal><div>Wedding portal</div></RequirePortal></MemoryRouter>)
  expect(await screen.findByText('Wedding portal')).toBeInTheDocument()
})
