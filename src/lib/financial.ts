import type { PaymentItem, BookingTask } from '@/lib/supabase/queries/workspace'
import type { Booking } from '@/lib/supabase/queries/bookings'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import { format } from 'date-fns'

export type OptionalCharge = { id: string; booking_id: string; label: string; amount_cents: number; status: 'pending' | 'approved' | 'waived'; included_in_contract: boolean; notes: string | null }
export type Receipt = { id: string; booking_id: string; payment_item_id: string | null; amount_cents: number; method: 'e_transfer' | 'cash' | 'card' | 'cheque' | 'other'; received_at: string; reference: string | null; notes: string | null }
export type ReminderDelivery = { id: string; booking_id: string; target_kind: 'payment' | 'task'; target_id: string; channel: 'email' | 'text' | 'phone'; recipient_address: string; sent_at: string; notes: string | null }
export type ReminderCandidate = { bookingId: string; targetId: string; kind: 'payment' | 'task'; title: string; due: string; channel: 'email' | 'text' | 'phone' | null; recipient: string | null; couple: string; weddingDate: string }

export function financialPosition(contractTotalCents: number | null, charges: OptionalCharge[], receipts: Receipt[]) {
  const addedChargesCents = charges.filter(charge => charge.status === 'approved' && !charge.included_in_contract).reduce((sum, charge) => sum + charge.amount_cents, 0)
  const receivedCents = receipts.reduce((sum, receipt) => sum + receipt.amount_cents, 0)
  const totalDueCents = contractTotalCents === null ? null : contractTotalCents + addedChargesCents
  return {
    addedChargesCents, receivedCents, totalDueCents,
    outstandingCents: totalDueCents === null ? null : Math.max(0, totalDueCents - receivedCents),
    creditCents: totalDueCents === null ? null : Math.max(0, receivedCents - totalDueCents),
  }
}

export function preferredChannel(value: string | null | undefined): 'email' | 'text' | 'phone' | null {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'email') return 'email'
  if (normalized === 'text' || normalized === 'sms' || normalized === 'text message') return 'text'
  if (normalized === 'phone' || normalized === 'phone call') return 'phone'
  return null
}

export function dueReminders(input: { bookings: Booking[]; inquiries: Inquiry[]; tasks: BookingTask[]; payments: PaymentItem[]; deliveries: ReminderDelivery[]; settledBookingIds?: string[]; now: Date }): ReminderCandidate[] {
  const { bookings, inquiries, tasks, payments, deliveries, now } = input
  const cutoff = new Date(now.getTime() + 7 * 86400000)
  const cooldown = now.getTime() - 7 * 86400000
  const bookingById = new Map(bookings.map(booking => [booking.id, booking]))
  const inquiryById = new Map(inquiries.map(inquiry => [inquiry.id, inquiry]))
  const recent = (kind: 'payment' | 'task', id: string) => deliveries.some(delivery => delivery.target_kind === kind && delivery.target_id === id && new Date(delivery.sent_at).getTime() > cooldown)
  const make = (kind: 'payment' | 'task', id: string, bookingId: string, title: string, due: string): ReminderCandidate | null => {
    const booking = bookingById.get(bookingId)
    const inquiry = booking?.inquiry_id ? inquiryById.get(booking.inquiry_id) : null
    if (!booking || !inquiry || recent(kind, id)) return null
    const channel = preferredChannel(inquiry.preferred_contact)
    const recipient = channel === 'email' ? inquiry.preferred_contact_email?.trim() || inquiry.email : channel ? inquiry.phone : null
    return { bookingId, targetId: id, kind, title, due, channel, recipient: recipient || null, couple: inquiry.full_name, weddingDate: booking.start_date }
  }
  return [
    ...payments.filter(item => !input.settledBookingIds?.includes(item.booking_id) && item.paid_cents < item.amount_due_cents && item.due_on <= format(cutoff, 'yyyy-MM-dd')).map(item => make('payment', item.id, item.booking_id, item.label, item.due_on)),
    ...tasks.filter(task => task.area === 'planning' && task.remind_couple && !task.completed_at && task.due_at && new Date(task.due_at).getTime() <= cutoff.getTime()).map(task => make('task', task.id, task.booking_id, task.title, task.due_at!)),
  ].filter((item): item is ReminderCandidate => item !== null).sort((a, b) => a.due.localeCompare(b.due))
}
