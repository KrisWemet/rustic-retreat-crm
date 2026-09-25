import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  useEffect(() => () => client.clear(), [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// Remount the entire query scope on account changes. No cached wedding data or
// in-flight result from the previous account may enter the next account's UI.
export default function SessionQueryProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(session?.user.id ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  if (account === undefined) return <p className="p-8">Checking your session…</p>
  return <AccountQueries key={account ?? 'guest'}>{children}</AccountQueries>
}
