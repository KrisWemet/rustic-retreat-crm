import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dueReminders, financialPosition, type ReminderCandidate } from '@/lib/financial'
import { getWorkspaceAttention } from '@/lib/supabase/queries/workspace'
import { getFinancialOverview, getReminderDeliveries, recordReminderDelivery } from '@/lib/supabase/queries/finance'

function contactLink(item: ReminderCandidate) {
  if (!item.channel || !item.recipient) return null
  const body = `Hello ${item.couple}, this is a reminder about ${item.title} for your Rustic Retreat wedding on ${item.weddingDate}. Please contact us if you have any questions.`
  if (item.channel === 'email') return `mailto:${item.recipient}?subject=${encodeURIComponent('Rustic Retreat wedding reminder')}&body=${encodeURIComponent(body)}`
  if (item.channel === 'text') return `sms:${item.recipient}?body=${encodeURIComponent(body)}`
  return `tel:${item.recipient}`
}

export default function RemindersPage() {
  const client = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const { data, isLoading, error } = useQuery({ queryKey: ['reminders'], queryFn: async () => {
    const [finance, attention, deliveries] = await Promise.all([getFinancialOverview(), getWorkspaceAttention(), getReminderDeliveries()])
    const settledBookingIds = finance.agreements.filter(agreement => financialPosition(
      agreement.contract_total_cents,
      finance.charges.filter(charge => charge.booking_id === agreement.booking_id),
      finance.receipts.filter(receipt => receipt.booking_id === agreement.booking_id),
    ).outstandingCents === 0).map(agreement => agreement.booking_id)
    return { candidates: dueReminders({ bookings: finance.bookings, inquiries: finance.inquiries, tasks: attention.tasks, payments: finance.payments, deliveries: deliveries.recent, settledBookingIds, now: new Date() }), deliveries: deliveries.history }
  } })
  const record = async (item: ReminderCandidate) => {
    if (!item.channel || !item.recipient) return
    setErrorMessage(''); setSaving(item.targetId)
    try {
      await recordReminderDelivery(item.kind, item.targetId, item.channel, notes[item.targetId] || '')
      await client.invalidateQueries({ queryKey: ['reminders'] })
    } catch (cause) { setErrorMessage(cause instanceof Error ? cause.message : 'Could not record delivery.') }
    finally { setSaving(null) }
  }
  if (isLoading) return <p className="p-6">Loading reminders…</p>
  if (error || !data) return <p role="alert" className="p-6">Could not load reminders.</p>
  return <div className="space-y-5 p-6 text-slate-900"><div><h1 className="text-3xl font-bold">Reminders</h1><p className="text-sm text-slate-600">Payment items and explicitly marked couple planning tasks due within seven days or overdue. Completed items disappear. A recorded delivery pauses repeats for seven days.</p><p className="text-sm text-slate-600">Opening an email, text, or call link does not send or log a reminder. Confirm delivery below only after you actually send or speak to the couple.</p></div>{errorMessage && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">{errorMessage}</p>}
    <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Ready to contact · {data.candidates.length}</h2><ul className="mt-3 space-y-3">{data.candidates.map(item => <li key={`${item.kind}-${item.targetId}`} className="rounded-md border p-3 text-sm"><div><strong>{item.couple}</strong> · {item.kind === 'payment' ? 'Payment' : 'Planning task'}: {item.title} · due {item.kind === 'payment' ? item.due : new Date(item.due).toLocaleDateString('en-CA')} · <Link to={`/admin/bookings/${item.bookingId}`} className="text-blue-700 underline">Wedding</Link></div>{item.channel && item.recipient ? <><p>Preferred contact: {item.channel} · {item.recipient}</p><div className="mt-2 flex flex-wrap gap-2"><a href={contactLink(item) || '#'} className="rounded-md border px-3 py-2 text-blue-700 underline">Open {item.channel === 'phone' ? 'call' : item.channel} composer</a><input aria-label={`Delivery notes for ${item.title}`} value={notes[item.targetId] || ''} onChange={event => setNotes(current => ({ ...current, [item.targetId]: event.target.value }))} placeholder="What was sent or discussed?" className="min-w-48 flex-1 rounded-md border px-3 py-2" /><button type="button" disabled={saving === item.targetId} onClick={() => void record(item)} className="rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-50">Record sent</button></div></> : <p className="mt-1 text-amber-800">No usable contact preference or address. Update this lead before sending.</p>}</li>)}</ul>{!data.candidates.length && <p className="mt-2 text-sm text-slate-600">No reminders due.</p>}</section>
    <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Delivery history · latest 200</h2><ul className="mt-3 space-y-2 text-sm">{data.deliveries.map(delivery => <li key={delivery.id} className="border-t pt-2">{new Date(delivery.sent_at).toLocaleString('en-CA')} · {delivery.channel} to {delivery.recipient_address} · {delivery.target_kind}{delivery.notes ? ` · ${delivery.notes}` : ''}</li>)}</ul>{!data.deliveries.length && <p className="mt-2 text-sm text-slate-600">No deliveries recorded yet.</p>}</section>
  </div>
}
