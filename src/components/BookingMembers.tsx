import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assignBookingMember, getBookingMembers, removeBookingMember, type BookingMember } from '@/lib/supabase/queries/portal'

export default function BookingMembers({ bookingId }: { bookingId: string }) {
  const client = useQueryClient()
  const members = useQuery({ queryKey: ['booking-members', bookingId], queryFn: () => getBookingMembers(bookingId) })
  const [email, setEmail] = useState('')
  const [access, setAccess] = useState<BookingMember['access']>('couple')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = () => client.invalidateQueries({ queryKey: ['booking-members', bookingId] })
  const add = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try { await assignBookingMember(bookingId, email.trim(), access); await refresh(); setEmail('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not link account.') }
    finally { setBusy(false) }
  }
  const remove = async (member: BookingMember) => {
    setError(''); setBusy(true)
    try { await removeBookingMember(bookingId, member.user_id); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove access.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Wedding portal access</h2><p className="text-sm text-slate-600">Each partner registers with their own email, then you link both accounts as Couple. Staff and family receive operations access without financial records.</p>
    {members.isLoading && <p className="mt-2 text-sm">Loading accounts…</p>}
    {members.error && <p role="alert" className="mt-2 text-red-700">Could not load linked accounts.</p>}
    <ul className="my-3 space-y-2">{members.data?.map(member => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"><span>{member.email} · {member.access}</span><button type="button" disabled={busy} onClick={() => void remove(member)} className="text-red-700 underline">Remove access</button></li>)}</ul>
    {!members.isLoading && !members.data?.length && <p className="mb-3 text-sm text-amber-800">No portal accounts linked. The original booking contact does not get access automatically unless they have an account.</p>}
    <form onSubmit={event => void add(event)} className="flex flex-wrap gap-2"><input aria-label="Account email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Registered email" className="min-w-60 flex-1 rounded-md border px-3 py-2 text-sm" /><select aria-label="Access role" value={access} onChange={event => setAccess(event.target.value as BookingMember['access'])} className="rounded-md border px-3 py-2 text-sm"><option value="couple">Couple</option><option value="staff">Staff</option><option value="family">Family</option></select><button disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Link account</button></form>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>
}
