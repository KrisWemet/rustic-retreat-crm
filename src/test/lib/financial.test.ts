import { dueReminders, financialPosition, preferredChannel, type OptionalCharge, type Receipt, type ReminderDelivery } from '@/lib/financial'
import type { Booking } from '@/lib/supabase/queries/bookings'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import type { BookingTask, PaymentItem } from '@/lib/supabase/queries/workspace'

const charge = (status: OptionalCharge['status'], included_in_contract: boolean, amount_cents: number): OptionalCharge => ({ id: crypto.randomUUID(), booking_id: 'booking', label: 'Option', amount_cents, status, included_in_contract, notes: null })
const receipt = (amount_cents: number): Receipt => ({ id: crypto.randomUUID(), booking_id: 'booking', payment_item_id: null, amount_cents, method: 'e_transfer', received_at: '2026-09-24T12:00:00Z', reference: null, notes: null })

it('counts only approved extras outside the signed contract and records credits', () => {
  const charges = [charge('approved', false, 3000), charge('pending', false, 7000), charge('approved', true, 2000), charge('waived', false, 5000)]
  expect(financialPosition(20000, charges, [receipt(5000)])).toEqual({ addedChargesCents: 3000, receivedCents: 5000, totalDueCents: 23000, outstandingCents: 18000, creditCents: 0 })
  expect(financialPosition(null, charges, [receipt(5000)]).outstandingCents).toBeNull()
  expect(financialPosition(20000, charges, [receipt(24000)]).creditCents).toBe(1000)
})

it('uses the recorded contact preference without an SMS fallback', () => {
  expect(preferredChannel('Text message')).toBe('text')
  expect(preferredChannel('email')).toBe('email')
  expect(preferredChannel(null)).toBeNull()
})

it('stops completed, paid, and recently delivered reminders', () => {
  const now = new Date('2026-09-24T12:00:00Z')
  const bookings = [{ id: 'booking', inquiry_id: 'inquiry', start_date: '2027-06-11' }] as Booking[]
  const inquiries = [{ id: 'inquiry', full_name: 'Alex', email: 'alex@example.com', preferred_contact_email: 'reminders@example.com', phone: '555-1234', preferred_contact: 'email' }] as Inquiry[]
  const payments = [
    { id: 'open-payment', booking_id: 'booking', label: 'Installment', due_on: '2026-09-25', paid_cents: 0, amount_due_cents: 10000 },
    { id: 'paid', booking_id: 'booking', label: 'Paid', due_on: '2026-09-25', paid_cents: 10000, amount_due_cents: 10000 },
  ] as PaymentItem[]
  const tasks = [
    { id: 'open-task', booking_id: 'booking', area: 'planning', title: 'Questionnaire', due_at: '2026-09-25T12:00:00Z', remind_couple: true, completed_at: null },
    { id: 'done-task', booking_id: 'booking', area: 'planning', title: 'Done', due_at: '2026-09-25T12:00:00Z', remind_couple: true, completed_at: '2026-09-24T10:00:00Z' },
    { id: 'internal-task', booking_id: 'booking', area: 'operations', title: 'Internal', due_at: '2026-09-25T12:00:00Z', remind_couple: false, completed_at: null },
  ] as BookingTask[]
  const deliveries = [{ target_kind: 'task', target_id: 'open-task', sent_at: '2026-09-23T12:00:00Z' }] as ReminderDelivery[]
  const result = dueReminders({ bookings, inquiries, payments, tasks, deliveries, now })
  expect(result.map(item => item.targetId)).toEqual(['open-payment'])
  expect(result[0].channel).toBe('email')
  expect(result[0].recipient).toBe('reminders@example.com')
  expect(dueReminders({ bookings, inquiries, payments, tasks, deliveries, now,
    settledBookingIds: ['booking'] })).toEqual([])
  expect(dueReminders({ bookings, inquiries, payments, tasks, deliveries: [], now,
    settledBookingIds: ['booking'] }).map(item => item.targetId)).toEqual(['open-task'])
})
