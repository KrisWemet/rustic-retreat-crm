import { supabase } from '@/lib/supabase/client'

export type PortalRole = 'admin' | 'client' | 'staff' | 'family'
export type PortalWedding = {
  booking_id: string; access: 'couple' | 'staff' | 'family'
  start_date: string; end_date: string; package_name: string
  full_name: string; partner_name: string | null
  guest_reception_count: number; guest_camping_count: number; rv_count: number | null
}
export type PortalOperations = {
  camp: { group: string; kind: string; occupants: number; arrival: string; departure: string; site: string | null; contact: string | null; phone: string | null }[]
  cabin: { guests: string; occupants: number; arrival: string; departure: string } | null
  vendors: { name: string; service: string; arrival: string; departure: string | null; contact: string | null; phone: string | null; power: string | null }[]
  contacts: { name: string; role: string; phone: string }[]
  weather: { forecast: string | null; plan: string | null; decision: string | null; decided_at: string | null } | null
  checks: { id: string; label: string; area: string; owner: string | null; notes: string | null; completed_at: string | null }[]
  tasks: { title: string; area: string; assigned_to: string | null; due_at: string | null; completed_at: string | null }[]
}

export async function getMyRole(): Promise<PortalRole | null> {
  const { data, error } = await supabase.rpc('my_crm_role')
  if (error) throw error
  return data as PortalRole | null
}
export async function getMyWeddings(): Promise<PortalWedding[]> {
  const { data, error } = await supabase.rpc('get_my_weddings')
  if (error) throw error
  return (data || []) as PortalWedding[]
}
export async function getMyWeddingOperations(bookingId: string): Promise<PortalOperations> {
  const { data, error } = await supabase.rpc('get_my_wedding_operations', { p_booking_id: bookingId })
  if (error) throw error
  return data as PortalOperations
}
export type BookingMember = { user_id: string; email: string; access: 'couple' | 'staff' | 'family' }
export async function getBookingMembers(bookingId: string): Promise<BookingMember[]> {
  const { data, error } = await supabase.rpc('get_booking_members', { p_booking_id: bookingId })
  if (error) throw error
  return (data || []) as BookingMember[]
}
export async function assignBookingMember(bookingId: string, email: string, access: BookingMember['access']) {
  const { error } = await supabase.rpc('assign_booking_member', { p_booking_id: bookingId, p_email: email, p_access: access })
  if (error) throw error
}
export async function removeBookingMember(bookingId: string, userId: string) {
  const { error } = await supabase.rpc('remove_booking_member', { p_booking_id: bookingId, p_user_id: userId })
  if (error) throw error
}
