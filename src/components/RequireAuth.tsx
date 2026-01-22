import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

type Props = {
  children: React.ReactNode
}

export default function RequireAuth({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'authed' | 'guest'>(
    'checking',
  )

  useEffect(() => {
    let mounted = true

    const check = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error || !data.user) {
        setStatus('guest')
      } else {
        setStatus('authed')
      }
    }

    check()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
          <h1 className="text-lg font-semibold text-gray-900">Just a moment…</h1>
          <p className="mt-1 text-sm text-gray-600">Checking your session</p>
        </div>
      </div>
    )
  }

  if (status === 'guest') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

