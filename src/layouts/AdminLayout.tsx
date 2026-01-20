import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Calendar,
  CalendarDays,
  DollarSign,
  Home,
  Menu,
  Users,
  X,
} from 'lucide-react'
import { signOut } from '@/lib/supabase/auth'

const navigation = [
  { name: 'Dashboard', to: '/admin/dashboard', icon: Home },
  { name: 'Inquiries', to: '/admin/inquiries', icon: Users },
  { name: 'Bookings', to: '/admin/bookings', icon: Calendar },
  { name: 'Calendar', to: '/admin/calendar', icon: CalendarDays },
  { name: 'Payments', to: '/admin/payments', icon: DollarSign },
  { name: 'Reports', to: '/admin/reports', icon: BarChart },
]

const AdminLayout = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
      isActive
        ? 'bg-[#1e3a8a] text-[#3b82f6]'
        : 'text-[#d1d5db] hover:bg-[#374151] hover:text-white',
    ].join(' ')

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:bg-[#1f2937]">
        <div className="flex items-center justify-between px-6 py-6">
          <span className="text-lg font-semibold text-white">Navigation</span>
        </div>
        <nav className="flex-1 space-y-2 px-3 pb-6">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.name} to={item.to} className={navLinkClassName}>
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-slate-900">
              Rustic Retreat CRM
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">
              Shannon
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </button>
          </div>
        </header>

        {sidebarOpen ? (
          <div className="md:hidden border-b border-slate-200 bg-[#1f2937] shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-[#d1d5db]">
                Navigation
              </span>
              <button
                type="button"
                className="rounded-md p-1 text-slate-300 hover:text-white"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-2 px-3 pb-4">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={navLinkClassName}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ) : null}

        <main className="flex-1 bg-[#f9fafb] px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
