import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'

describe('LoginPage', () => {
  it('renders the admin login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    )

    expect(screen.getByText(/Admin Login/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
