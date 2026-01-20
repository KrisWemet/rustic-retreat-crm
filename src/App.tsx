import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import BookingsPage from './pages/admin/BookingsPage'
import CalendarPage from './pages/admin/CalendarPage'
import InquiriesPage from './pages/admin/InquiriesPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import ReportsPage from './pages/admin/ReportsPage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
