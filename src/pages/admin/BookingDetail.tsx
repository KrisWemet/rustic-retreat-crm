import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getBookingById } from '@/lib/supabase/queries/bookings'
import { getInquiries } from '@/lib/supabase/queries/inquiries'
import { addActivity, addPaymentItem, addTask, deleteUnpaidPaymentItem, getBookingWorkspace, saveWorkspace, setTaskCompletion, updatePaymentItem, type PaymentItem, type Workspace } from '@/lib/supabase/queries/workspace'
import BookingOperations from '@/components/BookingOperations'
import BookingMembers from '@/components/BookingMembers'
import BookingFinance from '@/components/BookingFinance'

const money = (cents: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)
const dateValue = (value: string | null) => value ? new Date(value).toLocaleString('en-CA') : 'Not recorded'
const localInput = (value: string | null | undefined) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''
const input = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

function WorkspaceEditor({ bookingId, workspace, refresh }: { bookingId: string; workspace: Workspace | null; refresh: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('')
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) || '').trim() || null
    const timestamp = (key: string) => value(key) ? new Date(value(key)!).toISOString() : null
    try {
      await saveWorkspace(bookingId, {
        contract_sent_at: timestamp('contract_sent_at'), contract_signed_at: timestamp('contract_signed_at'),
        contract_reference: value('contract_reference'), camping_notes: value('camping_notes'),
        planning_notes: value('planning_notes'), operations_notes: value('operations_notes'),
        setup_owner: value('setup_owner'), readiness_owner: value('readiness_owner'), checkout_owner: value('checkout_owner'),
      })
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save workspace') }
    finally { setSaving(false) }
  }
  return <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
    <section className={card}><h2 className="text-lg font-semibold">Contract</h2><p className="mb-3 text-sm text-slate-600">Record dates only after the document is sent or signed.</p>
      <label className="mb-3 block text-sm">Sent at<input name="contract_sent_at" type="datetime-local" defaultValue={localInput(workspace?.contract_sent_at)} className={input} /></label>
      <label className="mb-3 block text-sm">Signed at<input name="contract_signed_at" type="datetime-local" defaultValue={localInput(workspace?.contract_signed_at)} className={input} /></label>
      <label className="block text-sm">Contract reference or secure link<input name="contract_reference" defaultValue={workspace?.contract_reference || ''} className={input} /></label>
    </section>
    <section className={card}><h2 className="text-lg font-semibold">Camping</h2><p className="mb-3 text-sm text-slate-600">Booked counts are shown above; record arrival details here until the camping register is added.</p><label className="text-sm">Camping notes<textarea name="camping_notes" defaultValue={workspace?.camping_notes || ''} rows={6} className={input} /></label></section>
    <section className={card}><h2 className="text-lg font-semibold">Planning</h2><label className="text-sm">Open decisions and documents<textarea name="planning_notes" defaultValue={workspace?.planning_notes || ''} rows={6} className={input} /></label></section>
    <section className={card}><h2 className="text-lg font-semibold">Operations</h2><div className="grid gap-3 sm:grid-cols-3">{(['setup_owner','readiness_owner','checkout_owner'] as const).map(key => <label key={key} className="text-sm capitalize">{key.replace('_', ' ')}<input name={key} defaultValue={workspace?.[key] || ''} className={input} /></label>)}</div><label className="mt-3 block text-sm">Operations notes<textarea name="operations_notes" defaultValue={workspace?.operations_notes || ''} rows={3} className={input} /></label></section>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="lg:col-span-2"><button disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save wedding details'}</button></div>
  </form>
}

export default function BookingDetail() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const [error, setError] = useState('')
  const booking = useQuery({ queryKey: ['booking', id], queryFn: () => getBookingById(id), enabled: !!id })
  const inquiries = useQuery({ queryKey: ['inquiries'], queryFn: getInquiries })
  const workspace = useQuery({ queryKey: ['booking-workspace', id], queryFn: () => getBookingWorkspace(id), enabled: !!id })
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['booking-workspace', id] }), client.invalidateQueries({ queryKey: ['booking-finance', id] }), client.invalidateQueries({ queryKey: ['financial-overview'] }), client.invalidateQueries({ queryKey: ['dashboard-attention'] }), client.invalidateQueries({ queryKey: ['reminders'] })]) }
  const run = async (action: () => Promise<unknown>) => { setError(''); try { await action(); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save change') } }
  if (booking.isLoading || workspace.isLoading || inquiries.isLoading) return <p className="p-6">Loading wedding workspace…</p>
  if (booking.error || workspace.error || inquiries.error || !booking.data || !workspace.data) return <p role="alert" className="p-6 text-red-700">Could not load this wedding. Check your access and try again.</p>
  const b = booking.data, w = workspace.data
  const inquiry = inquiries.data?.find(item => item.id === b.inquiry_id)
  const due = w.payments.reduce((sum, item) => sum + item.amount_due_cents, 0)
  const paid = w.payments.reduce((sum, item) => sum + item.paid_cents, 0)
  const base = b.package_terms?.basePriceCents
  const overage = b.reception_overage_total_cents || 0
  return <div className="min-h-screen space-y-5 bg-brand-cream p-6 text-slate-900">
    <div><Link className="text-sm text-blue-700 underline" to="/admin/bookings">← All bookings</Link><h1 className="mt-2 text-3xl font-bold">{inquiry ? `${inquiry.full_name}${inquiry.partner_name ? ` & ${inquiry.partner_name}` : ''}` : 'Wedding workspace'}</h1><p className="text-sm text-slate-600">{b.start_date} through {b.end_date} · {b.package_terms?.name || b.package.replaceAll('_',' ')} · {b.status}</p>{inquiry && <p className="mt-1 text-sm text-slate-600">{inquiry.email}{inquiry.phone ? ` · ${inquiry.phone}` : ''} · prefers {inquiry.preferred_contact || 'contact method not recorded'}</p>}</div>
    <div className="grid gap-3 md:grid-cols-3"><div className={card}><h2 className="font-semibold">Agreement</h2><p>Base: {base == null ? 'Check original contract' : money(base)}</p><p>Reception overage: {money(overage)}</p><p className="text-sm text-slate-600">{b.package_terms ? 'Plus GST where applicable; contract controls.' : 'Historical terms need review.'}</p><p className="mt-2 text-sm">Contract signed: {dateValue(w.workspace?.contract_signed_at || null)}</p></div><div className={card}><h2 className="font-semibold">Guests and camping</h2><p>{b.guest_reception_count} reception · {b.guest_camping_count} camping</p><p>{b.rv_count ?? 'Unknown'} RVs</p><p className="text-sm text-slate-600">See the nightly register below for actual stays.</p></div><div className={card}><h2 className="font-semibold">Payment items</h2><p>Scheduled: {money(due)}</p><p>Recorded paid: {money(paid)}</p><p>Outstanding on schedule: {money(due - paid)}</p><p className="text-sm text-slate-600">{w.payments.length ? 'Manually entered items; reconcile against the contract.' : 'No payment schedule recorded.'}</p></div></div>
    <WorkspaceEditor key={`${id}-${w.workspace?.updated_at || 'new'}`} bookingId={id} workspace={w.workspace} refresh={refresh} />
    <BookingOperations booking={b} />
    <BookingMembers bookingId={b.id} />
    <BookingFinance booking={b} />
    <div className="grid gap-4 lg:grid-cols-2"><section className={card}><h2 className="text-lg font-semibold">Planning and operations tasks</h2><ul className="my-3 space-y-2">{w.tasks.map(task => <li key={task.id} className="flex gap-2 text-sm"><input type="checkbox" aria-label={`Complete ${task.title}`} checked={!!task.completed_at} onChange={event => void run(() => setTaskCompletion(task.id, event.target.checked))} /><span className={task.completed_at ? 'line-through text-slate-500' : ''}>{task.area}: {task.title}{task.assigned_to ? ` · ${task.assigned_to}` : ''}{task.due_at ? ` · due ${new Date(task.due_at).toLocaleDateString()}` : ''}</span></li>)}</ul>{!w.tasks.length && <p className="my-3 text-sm text-slate-600">No tasks yet.</p>}
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await addTask({ booking_id: id, area: data.get('area') as 'planning' | 'operations', title: String(data.get('title') || '').trim(), assigned_to: String(data.get('assigned_to') || '').trim() || null, due_at: data.get('due_at') ? new Date(String(data.get('due_at'))).toISOString() : null, remind_couple: data.get('remind_couple') === 'on' && data.get('area') === 'planning' }); form.reset() }) }}><select name="area" className={input}><option value="planning">Planning</option><option value="operations">Operations</option></select><input name="title" required maxLength={200} placeholder="Task" className={input} /><input name="assigned_to" placeholder="Owner" className={input} /><input name="due_at" type="datetime-local" className={input} /><label className="flex items-center gap-2 text-sm"><input name="remind_couple" type="checkbox" />Remind couple (planning tasks only)</label><button className="rounded-md bg-slate-900 px-3 py-2 text-white">Add task</button></form></section>
      <section className={card}><h2 className="text-lg font-semibold">Payment schedule</h2><ul className="my-3 space-y-3">{w.payments.map(item => <PaymentRow key={item.id} item={item} run={run} />)}</ul>{!w.payments.length && <p className="my-3 text-sm text-slate-600">No payment items yet.</p>}
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await addPaymentItem({ booking_id: id, label: String(data.get('label') || '').trim(), amount_due_cents: Math.round(Number(data.get('amount')) * 100), due_on: String(data.get('due_on')) }); form.reset() }) }}><input name="label" required maxLength={120} placeholder="Deposit / installment" className={input} /><input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount CAD" className={input} /><input name="due_on" type="date" required className={input} /><button className="rounded-md bg-slate-900 px-3 py-2 text-white">Add payment item</button></form></section></div>
    <section className={card}><h2 className="text-lg font-semibold">Activity and communication</h2><p className="text-sm text-slate-600">Changes to wedding details, operations, tasks, and payment items are recorded here. Add notes for calls, emails, or decisions.</p><form className="my-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await addActivity(id, data.get('kind') as 'note' | 'communication', String(data.get('details') || '').trim()); form.reset() }) }}><select name="kind" className={input + ' max-w-44'}><option value="note">Note</option><option value="communication">Communication</option></select><input name="details" required maxLength={5000} placeholder="What happened?" className={input + ' flex-1'} /><button className="rounded-md bg-slate-900 px-3 py-2 text-white">Record</button></form><ul className="space-y-2 text-sm">{w.activity.map(entry => <li key={entry.id} className="border-t pt-2"><span className="font-medium">{entry.kind}</span> · {dateValue(entry.created_at)} · {entry.actor_label || 'System'} · {entry.details}</li>)}</ul></section>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>
}

function PaymentRow({ item, run }: { item: PaymentItem; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  return <li className="rounded-md border p-3 text-sm"><strong>{item.label}</strong> · due {item.due_on}<p>{money(item.paid_cents)} received of {money(item.amount_due_cents)} scheduled</p><p className="text-slate-600">Record individual payments in Financial record above.</p>
    <div className="mt-2 flex gap-3"><button type="button" onClick={() => setEditing(!editing)} className="text-blue-700 underline">{editing ? 'Cancel edit' : 'Edit installment'}</button>{item.paid_cents === 0 && <button type="button" onClick={() => { if (window.confirm('Remove this unpaid installment from the schedule?')) void run(() => deleteUnpaidPaymentItem(item.id)) }} className="text-red-700 underline">Remove unpaid item</button>}</div>
    {editing && <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const amount = Math.round(Number(form.get('amount')) * 100); void run(async () => { if (!Number.isSafeInteger(amount) || amount <= 0 || amount < item.paid_cents) throw new Error('Installment amount must be positive and at least the amount already received.'); await updatePaymentItem(item.id, { label: String(form.get('label') || '').trim(), amount_due_cents: amount, due_on: String(form.get('due_on')) }); setEditing(false) }) }}><input name="label" required maxLength={120} defaultValue={item.label} className={input} /><input name="amount" type="number" min={(Math.max(1, item.paid_cents) / 100).toFixed(2)} step="0.01" required defaultValue={(item.amount_due_cents / 100).toFixed(2)} className={input} /><input name="due_on" type="date" required defaultValue={item.due_on} className={input} /><button className="rounded-md bg-slate-900 px-3 py-2 text-white">Save installment</button></form>}
  </li>
}
