import { supabase } from '@/lib/supabase/client'
import type { PackageType } from '@/lib/validators/booking'

export type Booking = {
  id: string
  inquiry_id: string | null
  client_user_id: string | null
  package: PackageType
  start_date: string
  end_date: string
  guest_reception_count: number
  guest_camping_count: number
  created_at: string
  updated_at: string
}

export async function getBookings(): Promise<Booking[]> {
  const { data } = await supabase.from('bookings').select('*').order('start_date', { ascending: true })
  return data || []
}

export async function createBooking(input: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking> {
  const { data, error } = await supabase.from('bookings').insert([input]).select().single()
  if (error) throw error
  return data
}

