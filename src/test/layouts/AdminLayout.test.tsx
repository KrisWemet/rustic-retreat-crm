import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'

function Dummy() {
  return <div>Dashboard Content</div>
}

describe('AdminLayout', () => {
  it('renders header and outlet content', () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dummy />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Rustic Retreat CRM/i)).toBeInTheDocument()
    expect(screen.getByText(/Dashboard Content/i)).toBeInTheDocument()
  })
})
