import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import SessionQueryProvider from '@/components/SessionQueryProvider'

let authChanged: (event: string, session: { user: { id: string } } | null) => void
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: {
  onAuthStateChange: (callback: typeof authChanged) => {
    authChanged = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  },
} } }))

it('discards cached wedding data and pending requests when the account changes', async () => {
  let currentClient: QueryClient | undefined
  let finishOldRequest: (value: string) => void = () => {}
  const oldRequest = new Promise<string>(resolve => { finishOldRequest = resolve })
  const load = vi.fn().mockReturnValueOnce(oldRequest).mockResolvedValue('Second couple wedding')
  function Wedding() {
    const client = useQueryClient()
    useEffect(() => { currentClient = client }, [client])
    const { data } = useQuery({ queryKey: ['portal-weddings'], queryFn: load })
    return <p>{data ?? 'No wedding loaded'}</p>
  }
  render(<SessionQueryProvider><Wedding /></SessionQueryProvider>)
  act(() => authChanged('INITIAL_SESSION', { user: { id: 'first-couple' } }))
  const firstClient = currentClient!
  act(() => firstClient.setQueryData(['private-financials'], 'First couple payment'))
  act(() => authChanged('TOKEN_REFRESHED', { user: { id: 'first-couple' } }))
  expect(currentClient).toBe(firstClient)
  act(() => authChanged('SIGNED_IN', { user: { id: 'second-couple' } }))
  expect(currentClient).not.toBe(firstClient)
  expect(currentClient!.getQueryData(['private-financials'])).toBeUndefined()
  expect(firstClient.getQueryCache().getAll()).toHaveLength(0)
  await act(async () => finishOldRequest('First couple wedding'))
  expect(await screen.findByText('Second couple wedding')).toBeInTheDocument()
  expect(screen.queryByText('First couple wedding')).not.toBeInTheDocument()
  act(() => authChanged('SIGNED_OUT', null))
  expect(currentClient!.getQueryData(['portal-weddings'])).toBeUndefined()
})
