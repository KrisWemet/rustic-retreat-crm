import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { Booking } from '@/lib/supabase/queries/bookings'
import { addOptionalCharge, addReceipt, allocateReceipt, getBookingFinance, removeReceipt, saveFinancialAgreement, updateOptionalCharge } from '@/lib/supabase/queries/finance'
import { financialPosition, type OptionalCharge } from '@/lib/financial'

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'
const button = 'rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50'
const money = (cents: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)
const local = (value: string | null | undefined) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''
const value = (form: FormData, key: string) => String(form.get(key) || '').trim()
const cents = (form: FormData, key: string) => Math.round(Number(value(form, key)) * 100)

export default function BookingFinance({ booking }: { booking: Booking }) {
  const client = useQueryClient()
  const finance = useQuery({ queryKey: ['booking-finance', booking.id], queryFn: () => getBookingFinance(booking.id) })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<void>, form?: HTMLFormElement) => {
    setMessage(''); setBusy(true)
    try {
      await action()
      await Promise.all([
        client.invalidateQueries({ queryKey: ['booking-finance', booking.id] }),
        client.invalidateQueries({ queryKey: ['booking-workspace', booking.id] }),
        client.invalidateQueries({ queryKey: ['financial-overview'] }),
        client.invalidateQueries({ queryKey: ['dashboard-attention'] }),
        client.invalidateQueries({ queryKey: ['reminders'] }),
      ])
      form?.reset(); setMessage('Saved.')
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not save financial record.') }
    finally { setBusy(false) }
  }
  if (finance.isLoading) return <section className={card}>Loading financial records…</section>
  if (finance.error || !finance.data) return <section role="alert" className={card}>Could not load financial records. Check your access and try again.</section>
  const { agreement, charges, receipts, schedule } = finance.data
  const position = financialPosition(agreement?.contract_total_cents ?? null, charges, receipts)
  const scheduled = schedule.reduce((sum, item) => sum + item.amount_due_cents, 0)
  const updateCharge = (charge: OptionalCharge, next: OptionalCharge['status'], included = charge.included_in_contract) => run(() => updateOptionalCharge(charge.id, { status: next, included_in_contract: included }))
  const submitAgreement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form), total = cents(data, 'contract_total')
    if (!Number.isSafeInteger(total) || total < 0) return setMessage('Enter a valid agreed contract total.')
    void run(() => saveFinancialAgreement({ booking_id: booking.id, contract_total_cents: total, agreed_at: value(data, 'agreed_at') ? new Date(value(data, 'agreed_at')).toISOString() : null, notes: value(data, 'notes') || null }))
  }
  const submitCharge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form), amount = cents(data, 'amount')
    if (!Number.isSafeInteger(amount) || amount <= 0) return setMessage('Enter a positive optional-charge amount.')
    void run(() => addOptionalCharge({ booking_id: booking.id, label: value(data, 'label'), amount_cents: amount, status: 'pending', included_in_contract: false, notes: value(data, 'notes') || null }), form)
  }
  const submitReceipt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form), amount = cents(data, 'amount')
    if (!Number.isSafeInteger(amount) || amount <= 0) return setMessage('Enter a positive receipt amount.')
    void run(() => addReceipt({ booking_id: booking.id, payment_item_id: value(data, 'payment_item_id') || null, amount_cents: amount, method: value(data, 'method') as 'e_transfer' | 'cash' | 'card' | 'cheque' | 'other', received_at: new Date(value(data, 'received_at')).toISOString(), reference: value(data, 'reference') || null, notes: value(data, 'notes') || null }), form)
  }
  return <div className="space-y-4"><h2 className="text-2xl font-bold">Financial record</h2>{message && <p role="status" className="rounded-md bg-slate-100 p-3 text-sm">{message}</p>}
    <div className="grid gap-4 lg:grid-cols-2"><section className={card}><h3 className="text-lg font-semibold">Agreed contract total</h3><p className="text-sm text-slate-600">Package snapshot: {booking.package_terms ? money(booking.package_terms.basePriceCents) : 'Historical terms need review'} · reception overage: {money(booking.reception_overage_total_cents || 0)}. Enter the signed contract total, including its tax and agreed charges. Do not infer GST or fees.</p><form key={agreement?.updated_at || 'new'} onSubmit={submitAgreement} className="mt-3 grid gap-2"><label className="text-sm">Total CAD<input name="contract_total" type="number" min="0" step="0.01" required defaultValue={agreement ? (agreement.contract_total_cents / 100).toFixed(2) : ''} className={field} /></label><label className="text-sm">Agreement date<input name="agreed_at" type="datetime-local" defaultValue={local(agreement?.agreed_at)} className={field} /></label><label className="text-sm">Contract reference or reconciliation notes<textarea name="notes" defaultValue={agreement?.notes || ''} className={field} /></label><button disabled={busy} className={button}>Save agreed total</button></form></section>
      <section className={card}><h3 className="text-lg font-semibold">Balance</h3><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>Signed total</dt><dd>{agreement ? money(agreement.contract_total_cents) : 'Not recorded'}</dd><dt>Approved extras outside contract</dt><dd>{money(position.addedChargesCents)}</dd><dt>Total due</dt><dd className="font-semibold">{position.totalDueCents === null ? 'Not recorded' : money(position.totalDueCents)}</dd><dt>Receipts recorded</dt><dd>{money(position.receivedCents)}</dd><dt>Outstanding</dt><dd className="font-semibold">{position.outstandingCents === null ? 'Unknown until contract total entered' : money(position.outstandingCents)}</dd>{position.creditCents ? <><dt>Credit to reconcile</dt><dd>{money(position.creditCents)}</dd></> : null}<dt>Scheduled installments</dt><dd>{money(scheduled)}</dd></dl>{position.totalDueCents !== null && scheduled !== position.totalDueCents && <p className="mt-3 text-sm text-amber-800">The installment schedule does not equal total due. Reconcile it with the contract and approved extras.</p>}<p className="mt-3 text-sm text-slate-600">The damage deposit is tracked separately in property operations and is not included here.</p></section></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className={card}><h3 className="text-lg font-semibold">Optional charges</h3><p className="text-sm text-slate-600">New charges are pending until explicitly approved. Mark items already included in the signed total to avoid double counting.</p><ul className="my-3 space-y-2 text-sm">{charges.map(charge => <li key={charge.id} className="rounded-md border p-2"><strong>{charge.label}</strong> · {money(charge.amount_cents)} · {charge.status}{charge.included_in_contract ? ' · included in contract' : ''}{charge.notes ? ` · ${charge.notes}` : ''}<div className="mt-2 flex flex-wrap gap-2"><select aria-label={`${charge.label} status`} value={charge.status} disabled={busy} onChange={event => void updateCharge(charge, event.target.value as OptionalCharge['status'])} className={field + ' max-w-40'}><option value="pending">Pending</option><option value="approved">Approved</option><option value="waived">Waived</option></select><label className="flex items-center gap-1"><input type="checkbox" checked={charge.included_in_contract} disabled={busy} onChange={event => void updateCharge(charge, charge.status, event.target.checked)} /> In signed total</label></div></li>)}</ul><form onSubmit={submitCharge} className="grid gap-2"><input name="label" required maxLength={120} placeholder="Charge description" className={field} /><input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount CAD" className={field} /><input name="notes" placeholder="Contract or approval note" className={field} /><button disabled={busy} className={button}>Add pending charge</button></form></section>
      <section className={card}><h3 className="text-lg font-semibold">Payment receipts</h3><p className="text-sm text-slate-600">Record each actual payment, including manual e-transfers. Link it to an installment when applicable; unallocated receipts still reduce the total balance.</p><ul className="my-3 space-y-2 text-sm">{receipts.map(receipt => <li key={receipt.id} className="rounded-md border p-2"><strong>{money(receipt.amount_cents)}</strong> · {receipt.method.replace('_', ' ')} · {new Date(receipt.received_at).toLocaleString()}{receipt.reference ? ` · ${receipt.reference}` : ''}{receipt.notes ? ` · ${receipt.notes}` : ''}<label className="mt-2 block">Apply to installment<select value={receipt.payment_item_id || ''} disabled={busy} onChange={event => void run(() => allocateReceipt(receipt.id, event.target.value || null))} className={field}><option value="">Unallocated</option>{schedule.map(item => <option key={item.id} value={item.id}>{item.label} · due {item.due_on}</option>)}</select></label><button type="button" disabled={busy} onClick={() => { if (window.confirm('Remove this receipt after verifying the bank record?')) void run(() => removeReceipt(receipt.id)) }} className="ml-2 text-red-700 underline">Remove incorrect entry</button></li>)}</ul><form onSubmit={submitReceipt} className="grid gap-2"><input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount received CAD" className={field} /><select name="method" className={field}><option value="e_transfer">E-transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other / historical</option></select><label className="text-sm">Received at<input name="received_at" type="datetime-local" required defaultValue={local(new Date().toISOString())} className={field} /></label><select name="payment_item_id" className={field}><option value="">Unallocated to installment</option>{schedule.map(item => <option key={item.id} value={item.id}>{item.label} · due {item.due_on}</option>)}</select><input name="reference" placeholder="Bank or e-transfer reference" className={field} /><input name="notes" placeholder="Notes" className={field} /><button disabled={busy} className={button}>Record receipt</button></form></section></div>
  </div>
}
