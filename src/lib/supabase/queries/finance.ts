import { supabase } from '@/lib/supabase/client'
import type { OptionalCharge, Receipt, ReminderDelivery } from '@/lib/financial'
import type { PaymentItem } from '@/lib/supabase/queries/workspace'
import { getBookings } from '@/lib/supabase/queries/bookings'
import { getInquiries } from '@/lib/supabase/queries/inquiries'

export type FinancialAgreement = { booking_id: string; contract_total_cents: number; agreed_at: string | null; notes: string | null; updated_at: string }

export async function getBookingFinance(bookingId: string) {
  const [agreement, charges, receipts, schedule] = await Promise.all([
    supabase.from('booking_financial_agreement').select('*').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_optional_charges').select('*').eq('booking_id', bookingId).order('created_at'),
    supabase.from('booking_receipts').select('*').eq('booking_id', bookingId).order('received_at', { ascending: false }),
    supabase.from('booking_payment_items').select('*').eq('booking_id', bookingId).order('due_on'),
  ])
  for (const result of [agreement, charges, receipts, schedule]) if (result.error) throw result.error
  return { agreement: agreement.data as FinancialAgreement | null, charges: (charges.data || []) as OptionalCharge[], receipts: (receipts.data || []) as Receipt[], schedule: (schedule.data || []) as PaymentItem[] }
}
export async function getFinancialOverview() {
  const [bookings, inquiries, agreements, charges, receipts, payments] = await Promise.all([
    getBookings(), getInquiries(), supabase.from('booking_financial_agreement').select('*'),
    supabase.from('booking_optional_charges').select('*'), supabase.from('booking_receipts').select('*'),
    supabase.from('booking_payment_items').select('*'),
  ])
  for (const result of [agreements, charges, receipts, payments]) if (result.error) throw result.error
  return { bookings, inquiries, agreements: (agreements.data || []) as FinancialAgreement[], charges: (charges.data || []) as OptionalCharge[], receipts: (receipts.data || []) as Receipt[], payments: (payments.data || []) as PaymentItem[] }
}
export async function saveFinancialAgreement(data: Pick<FinancialAgreement, 'booking_id' | 'contract_total_cents' | 'agreed_at' | 'notes'>) {
  const { error } = await supabase.from('booking_financial_agreement').upsert(data, { onConflict: 'booking_id' })
  if (error) throw error
}
export async function addOptionalCharge(data: Omit<OptionalCharge, 'id'>) {
  const { error } = await supabase.from('booking_optional_charges').insert(data)
  if (error) throw error
}
export async function updateOptionalCharge(id: string, data: Pick<OptionalCharge, 'status' | 'included_in_contract'>) {
  const { error } = await supabase.from('booking_optional_charges').update(data).eq('id', id)
  if (error) throw error
}
export async function addReceipt(data: Omit<Receipt, 'id'>) {
  const { error } = await supabase.from('booking_receipts').insert(data)
  if (error) throw error
}
export async function removeReceipt(id: string) {
  const { error } = await supabase.from('booking_receipts').delete().eq('id', id)
  if (error) throw error
}
export async function allocateReceipt(id: string, paymentItemId: string | null) {
  const { error } = await supabase.from('booking_receipts').update({ payment_item_id: paymentItemId }).eq('id', id)
  if (error) throw error
}
export async function getReminderDeliveries() {
  const recentSince = new Date(Date.now() - 7 * 86400000).toISOString()
  const [recent, history] = await Promise.all([
    supabase.from('booking_reminder_deliveries').select('*').gt('sent_at', recentSince),
    supabase.from('booking_reminder_deliveries').select('*').order('sent_at', { ascending: false }).limit(200),
  ])
  if (recent.error) throw recent.error
  if (history.error) throw history.error
  return { recent: (recent.data || []) as ReminderDelivery[], history: (history.data || []) as ReminderDelivery[] }
}
export async function recordReminderDelivery(kind: 'payment' | 'task', targetId: string, channel: 'email' | 'text' | 'phone', notes: string) {
  const { error } = await supabase.rpc('record_reminder_delivery', { p_target_kind: kind, p_target_id: targetId, p_channel: channel, p_notes: notes })
  if (error) throw error
}
