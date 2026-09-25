import { supabase } from '@/lib/supabase/client'

export type Workspace = {
  booking_id: string
  contract_sent_at: string | null
  contract_signed_at: string | null
  contract_reference: string | null
  camping_notes: string | null
  planning_notes: string | null
  operations_notes: string | null
  setup_owner: string | null
  readiness_owner: string | null
  checkout_owner: string | null
  updated_at: string
}
export type BookingTask = {
  id: string; booking_id: string; area: 'planning' | 'operations'; title: string
  assigned_to: string | null; due_at: string | null; completed_at: string | null; created_at: string; remind_couple: boolean
}
export type PaymentItem = {
  id: string; booking_id: string; label: string; amount_due_cents: number
  paid_cents: number; due_on: string; paid_at: string | null; created_at: string
}
export type Activity = {
  id: string; booking_id: string; kind: 'note' | 'communication' | 'change'
  details: string; actor_user_id: string | null; actor_label: string | null; created_at: string
}

export async function getBookingWorkspace(bookingId: string) {
  const [workspace, tasks, payments, activity] = await Promise.all([
    supabase.from('booking_workspace').select('*').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_tasks').select('*').eq('booking_id', bookingId).order('created_at'),
    supabase.from('booking_payment_items').select('*').eq('booking_id', bookingId).order('due_on'),
    supabase.from('booking_activity').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(100),
  ])
  for (const result of [workspace, tasks, payments, activity]) if (result.error) throw result.error
  return { workspace: workspace.data as Workspace | null, tasks: (tasks.data || []) as BookingTask[], payments: (payments.data || []) as PaymentItem[], activity: (activity.data || []) as Activity[] }
}

export async function getWorkspaceAttention() {
  const [workspaces, tasks, payments] = await Promise.all([
    supabase.from('booking_workspace').select('*'),
    supabase.from('booking_tasks').select('*').is('completed_at', null),
    supabase.from('booking_payment_items').select('*'),
  ])
  for (const result of [workspaces, tasks, payments]) if (result.error) throw result.error
  return { workspaces: (workspaces.data || []) as Workspace[], tasks: (tasks.data || []) as BookingTask[], payments: (payments.data || []) as PaymentItem[] }
}

export async function saveWorkspace(bookingId: string, data: Partial<Omit<Workspace, 'booking_id' | 'updated_at'>>) {
  const { error } = await supabase.from('booking_workspace').upsert({ booking_id: bookingId, ...data }, { onConflict: 'booking_id' })
  if (error) throw error
}
export async function addTask(data: Pick<BookingTask, 'booking_id' | 'area' | 'title' | 'assigned_to' | 'due_at'> & { remind_couple?: boolean }) {
  const { error } = await supabase.from('booking_tasks').insert(data)
  if (error) throw error
}
export async function setTaskCompletion(taskId: string, complete: boolean) {
  const { error } = await supabase.from('booking_tasks').update({ completed_at: complete ? new Date().toISOString() : null }).eq('id', taskId)
  if (error) throw error
}
export async function addPaymentItem(data: Pick<PaymentItem, 'booking_id' | 'label' | 'amount_due_cents' | 'due_on'>) {
  const { error } = await supabase.from('booking_payment_items').insert(data)
  if (error) throw error
}
export async function updatePaymentItem(id: string, data: Pick<PaymentItem, 'label' | 'amount_due_cents' | 'due_on'>) {
  const { error } = await supabase.rpc('update_booking_payment_item', {
    p_item_id: id, p_label: data.label, p_amount_due_cents: data.amount_due_cents, p_due_on: data.due_on,
  })
  if (error) throw error
}
export async function deleteUnpaidPaymentItem(id: string) {
  const { error } = await supabase.rpc('delete_unpaid_booking_payment_item', { p_item_id: id })
  if (error) throw error
}
export async function addActivity(bookingId: string, kind: 'note' | 'communication', details: string) {
  const { error } = await supabase.from('booking_activity').insert({ booking_id: bookingId, kind, details })
  if (error) throw error
}
