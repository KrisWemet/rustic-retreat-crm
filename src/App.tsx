import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import BookingsPage from './pages/admin/BookingsPage'
import CalendarPage from './pages/admin/CalendarPage'
import InquiriesPage from './pages/admin/InquiriesPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import ReportsPage from './pages/admin/ReportsPage'
import LoginPage from './pages/LoginPage'
import RequireAuth from './components/RequireAuth'
import InquiryBoard from './pages/admin/InquiryBoard'
import BookingDetail from './pages/admin/BookingDetail'
import ClientPortal from './pages/portal/ClientPortal'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/portal" element={<ClientPortal />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inquiries" element={<InquiryBoard />} />
          <Route path="inquiries/list" element={<InquiriesPage />} />
          <Route path="inquiries/board" element={<InquiryBoard />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
