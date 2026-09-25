import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { getMyRole } from '@/lib/supabase/queries/portal'

export default function RequirePortal({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'guest' | 'admin' | 'portal' | 'error'>('checking')
  useEffect(() => {
    let active = true
    let serial = 0
    const check = async () => {
      const current = ++serial
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!active || current !== serial) return
        if (error || !data.user) return setStatus('guest')
        const role = await getMyRole()
        if (!active || current !== serial) return
        setStatus(role === 'admin' ? 'admin' : ['client', 'staff', 'family'].includes(role || '') ? 'portal' : 'error')
      } catch { if (active && current === serial) setStatus('error') }
    }
    void check()
    const { data } = supabase.auth.onAuthStateChange(() => { void check() })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  if (status === 'checking') return <p className="p-8">Checking your account…</p>
  if (status === 'guest') return <Navigate to="/" replace />
  if (status === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (status === 'error') return <p role="alert" className="p-8">Could not verify portal access. Please sign in again.</p>
  return <>{children}</>
}
