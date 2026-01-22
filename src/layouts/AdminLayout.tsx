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
  { name: 'Leads', to: '/admin/inquiries', icon: Users },
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
      'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-white/20 text-white shadow-sm'
        : 'text-white/80 hover:bg-white/10 hover:text-white',
    ].join(' ')

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
    navigate('/')
  }

  const SidebarContent = () => (
    <>
      {/* Brand Lockup */}
      <div className="flex h-16 shrink-0 items-center px-4">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Planning Pod
        </h1>
      </div>

      {/* User Profile Section (Top of Sidebar) */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3 shadow-inner">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--accent)] shadow-sm">
            S
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">Shannon</p>
            <div className="flex items-center gap-1">
                <button 
                  onClick={handleSignOut} 
                  className="truncate text-xs text-white/70 hover:text-white hover:underline flex items-center gap-1"
                >
                   {isSigningOut ? 'Signing out...' : 'Log out'}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.name} to={item.to} className={navLinkClassName}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>
      
      {/* Footer Branding/Version */}
      <div className="p-4 text-xs text-white/40">
        v1.0.0
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[var(--sidebar-w)] bg-[var(--accent)] shadow-xl transition-transform">
            <div className="flex items-center justify-end p-4">
              <button
                type="button"
                className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[var(--sidebar-w)] md:flex-col md:bg-[var(--accent)] md:shadow-xl z-30">
        <SidebarContent />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex min-h-screen flex-col transition-all duration-300 md:pl-[var(--sidebar-w)]">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 shadow-sm md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-[var(--text)] hover:bg-[var(--bg)]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-bold tracking-tight text-[var(--text)]">
              Planning Pod
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
