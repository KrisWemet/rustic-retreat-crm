import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'

describe('LoginPage', () => {
  it('offers sign-in and separate portal-account registration', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    )

    expect(screen.getByText(/Rustic Retreat sign in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a wedding portal account/i })).toBeInTheDocument()
  })
})
