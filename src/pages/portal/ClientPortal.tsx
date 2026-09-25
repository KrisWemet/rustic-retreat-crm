import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { signOut } from '@/lib/supabase/auth'
import { getMyWeddingOperations, getMyWeddings } from '@/lib/supabase/queries/portal'
import { updateOpsCheck } from '@/lib/supabase/queries/operations'

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
const stamp = (value: string | null) => value ? new Date(value).toLocaleString('en-CA') : 'Pending'

export default function ClientPortal() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const weddings = useQuery({ queryKey: ['portal-weddings'], queryFn: getMyWeddings })
  const selected = weddings.data?.find(item => item.booking_id === selectedId) || weddings.data?.[0]
  const operations = useQuery({ queryKey: ['portal-operations', selected?.booking_id], queryFn: () => getMyWeddingOperations(selected!.booking_id), enabled: Boolean(selected) })
  const toggleCheck = async (id: string, owner: string | null, notes: string | null, complete: boolean) => {
    if (!selected) return
    setSaving(id); setActionError('')
    try {
      await updateOpsCheck(id, { owner, notes, completed_at: complete ? new Date().toISOString() : null })
      await client.invalidateQueries({ queryKey: ['portal-operations', selected.booking_id] })
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not save check.') }
    finally { setSaving(null) }
  }
  const logout = async () => { await signOut(); navigate('/') }
  return <div className="min-h-screen bg-brand-cream p-6 text-slate-900"><div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Your Rustic Retreat</h1><p className="text-sm text-slate-600">Your assigned wedding information and property plan.</p></div><div className="flex gap-3"><a className="text-blue-700 underline" href="mailto:rusticretreatalberta@gmail.com">Contact venue</a><button type="button" onClick={() => void logout()} className="text-blue-700 underline">Sign out</button></div></header>
    {weddings.isLoading && <p>Loading your weddings…</p>}
    {weddings.error && <p role="alert">Could not load your wedding access. Please try again.</p>}
    {!weddings.isLoading && !weddings.error && !weddings.data?.length && <section className={card}><h2 className="text-lg font-semibold">Account ready</h2><p>Your account has not been linked to a wedding yet. Ask the venue team to add this email address to your booking. Each partner can have a separate login.</p></section>}
    {selected && <><div className="flex flex-wrap gap-2">{weddings.data?.map(wedding => <button key={wedding.booking_id} type="button" onClick={() => setSelectedId(wedding.booking_id)} className={`rounded-md px-3 py-2 text-sm ${wedding.booking_id === selected.booking_id ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>{wedding.start_date} · {wedding.full_name}</button>)}</div>
      <section className={card}><p className="text-sm font-semibold uppercase text-slate-500">{selected.access === 'couple' ? 'Your wedding' : `${selected.access} operations access`}</p><h2 className="text-2xl font-bold">{selected.full_name}{selected.partner_name ? ` & ${selected.partner_name}` : ''}</h2><p>{selected.start_date} through {selected.end_date} · {selected.package_name}</p><p className="text-sm">{selected.guest_reception_count} reception guests · {selected.guest_camping_count} planned campers · {selected.rv_count ?? 'Unknown'} RVs planned</p></section>
      {operations.isLoading && <p>Loading the property plan…</p>}
      {operations.error && <p role="alert">Could not load the property plan.</p>}
      {operations.data && <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h3 className="text-lg font-semibold">Camping and cabin</h3><ul className="mt-2 space-y-2 text-sm">{operations.data.camp.map((group, index) => <li key={`${group.group}-${index}`}>{group.group} · {group.kind.toUpperCase()} · {group.occupants} guests · {group.arrival}–{group.departure}{group.site ? ` · ${group.site}` : ''}{group.contact ? ` · ${group.contact}` : ''}{group.phone ? ` · ${group.phone}` : ''}</li>)}</ul>{!operations.data.camp.length && <p className="text-sm text-slate-600">Camping groups have not been entered yet.</p>}{operations.data.cabin && <p className="mt-3 text-sm">Cabin: {operations.data.cabin.guests} · {operations.data.cabin.occupants} guests · {operations.data.cabin.arrival}–{operations.data.cabin.departure}</p>}</section>
        <section className={card}><h3 className="text-lg font-semibold">Vendor arrivals</h3><ul className="mt-2 space-y-2 text-sm">{operations.data.vendors.map((vendor, index) => <li key={`${vendor.name}-${index}`}>{vendor.name} · {vendor.service} · {stamp(vendor.arrival)}{vendor.power ? ` · Power: ${vendor.power}` : ''}{vendor.contact ? ` · ${vendor.contact}` : ''}{vendor.phone ? ` · ${vendor.phone}` : ''}</li>)}</ul>{!operations.data.vendors.length && <p className="text-sm text-slate-600">No vendor arrivals recorded.</p>}</section>
        <section className={card}><h3 className="text-lg font-semibold">Planning and operations tasks</h3><ul className="mt-2 space-y-2 text-sm">{operations.data.tasks.map((task, index) => <li key={`${task.title}-${index}`}>{task.completed_at ? '☑' : '☐'} {task.title}{task.assigned_to ? ` · ${task.assigned_to}` : ''}{task.due_at ? ` · due ${stamp(task.due_at)}` : ''}</li>)}</ul>{!operations.data.tasks.length && <p className="text-sm text-slate-600">No visible tasks yet.</p>}</section>
        <section className={card}><h3 className="text-lg font-semibold">Weather and contacts</h3><p className="mt-2 text-sm">Forecast: {operations.data.weather?.forecast || 'Not recorded'}</p><p className="text-sm">Contingency: {operations.data.weather?.plan || 'Not recorded'}</p><p className="text-sm">Decision: {operations.data.weather?.decision || 'Pending'}</p><ul className="mt-3 space-y-1 text-sm">{operations.data.contacts.map((contact, index) => <li key={`${contact.name}-${index}`}>{contact.name} · {contact.role} · <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a></li>)}</ul></section>
        <section className={`${card} lg:col-span-2`}><h3 className="text-lg font-semibold">Property readiness</h3><p className="text-sm text-slate-600">{selected.access === 'couple' ? 'Your venue team updates these checks.' : 'Mark checks as the property team completes them.'}</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{operations.data.checks.map(check => <li key={check.id} className="rounded-md border p-3 text-sm"><label className="flex items-start gap-2"><input type="checkbox" checked={Boolean(check.completed_at)} disabled={selected.access === 'couple' || saving === check.id} onChange={event => void toggleCheck(check.id, check.owner, check.notes, event.target.checked)} /><span>{check.label}{check.owner ? ` · ${check.owner}` : ''}{check.notes ? ` · ${check.notes}` : ''}</span></label></li>)}</ul>{actionError && <p role="alert" className="mt-2 text-red-700">{actionError}</p>}</section>
      </div>}
    </>}
  </div></div>
}
