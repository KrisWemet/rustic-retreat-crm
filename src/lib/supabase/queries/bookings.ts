import { supabase } from '@/lib/supabase/client'
import type { PackageType } from '@/lib/validators/booking'
import type { PackageTerms } from '@/lib/packageCatalog'

export type Booking = {
  id: string
  inquiry_id: string | null
  client_user_id: string | null
  package: PackageType
  package_terms: PackageTerms | null
  start_date: string
  end_date: string
  guest_reception_count: number
  guest_camping_count: number
  rv_count: number | null
  reception_overage_rate_cents: number | null
  reception_overage_total_cents: number | null
  status: 'confirmed' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select('*').eq('status', 'confirmed').order('start_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single()
  if (error) throw error
  return data as Booking
}

export type ConfirmBookingInput = {
  inquiry_id: string
  package: Exclude<PackageType, 'two_day'>
  package_terms: PackageTerms
  start_date: string
  end_date: string
  guest_reception_count: number
  guest_camping_count: number
  rv_count: number
  reception_overage_rate_cents: number | null
}

export async function confirmBookingFromInquiry(input: ConfirmBookingInput): Promise<Booking> {
  const { data, error } = await supabase.rpc('confirm_booking_from_inquiry', {
    p_inquiry_id: input.inquiry_id,
    p_package: input.package,
    p_package_terms: input.package_terms,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    p_guest_reception_count: input.guest_reception_count,
    p_guest_camping_count: input.guest_camping_count,
    p_rv_count: input.rv_count,
    p_reception_overage_rate_cents: input.reception_overage_rate_cents,
  })
  if (error) throw error
  return data as Booking
}
