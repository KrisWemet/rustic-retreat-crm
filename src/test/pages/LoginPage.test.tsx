import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'

const resetPasswordForEmail = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args) } },
}))

const renderPage = () => render(<BrowserRouter><LoginPage /></BrowserRouter>)

describe('LoginPage', () => {
  it('offers sign-in, password reset, and separate portal-account registration', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a wedding portal account/i })).toBeInTheDocument()
  })

  it('sends a reset link to /reset-password without revealing whether the account exists', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/email/i), 'venue@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(resetPasswordForEmail).toHaveBeenCalledWith('venue@example.com', { redirectTo: `${window.location.origin}/reset-password` })
    expect(await screen.findByRole('status')).toHaveTextContent(/if that email has an account/i)
  })
})
