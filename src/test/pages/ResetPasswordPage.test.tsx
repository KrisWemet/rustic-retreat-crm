import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from '@/pages/ResetPasswordPage'

const getSession = vi.fn()
const updateUser = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      updateUser: (...args: unknown[]) => updateUser(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}))

const renderPage = () => render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>)

describe('ResetPasswordPage', () => {
  beforeEach(() => { window.location.hash = '' })

  it('asks for a new link when there is no recovery session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    renderPage()
    expect(await screen.findByRole('heading', { name: /link has expired/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute('href', '/')
  })

  it('shows the error Supabase puts in the link', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    getSession.mockResolvedValue({ data: { session: null } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Email link is invalid or has expired')
  })

  it('rejects mismatched passwords and saves a matching one', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'admin' } } } })
    updateUser.mockResolvedValue({ data: {}, error: null })
    rpc.mockResolvedValue({ data: 'admin', error: null })
    renderPage()

    await userEvent.type(await screen.findByLabelText(/^new password$/i), 'correct-horse')
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'correct-hors')
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i)
    expect(updateUser).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'e')
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }))
    expect(updateUser).toHaveBeenCalledWith({ password: 'correct-horse' })
  })
})
