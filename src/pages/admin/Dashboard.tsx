import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/lib/supabase/auth'

const Dashboard = () => {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-lg text-center space-y-6">
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome to Rustic Retreat CRM
        </h1>
        <p className="text-sm text-slate-500">
          Dashboard setup is coming soon.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isSigningOut ? 'Signing out...' : 'Log out'}
        </button>
      </div>
    </div>
  )
}

export default Dashboard
