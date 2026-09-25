import { supabase } from '@/lib/supabase/client'
import type { CampUnit } from '@/lib/operations'

export type CabinStay = { booking_id: string; guest_names: string; occupants: number; arrival_on: string; departure_on: string; notes: string | null }
export type VendorArrival = { id: string; booking_id: string; vendor_name: string; service: string; contact_name: string | null; contact_phone: string | null; arrival_at: string; departure_at: string | null; power_needs: string | null; notes: string | null }
export type EmergencyContact = { id: string; booking_id: string; name: string; role: string; phone: string; notes: string | null }
export type OpsProfile = { booking_id: string; weather_forecast: string | null; weather_plan: string | null; weather_decision: string | null; weather_decided_at: string | null; checkout_notes: string | null; checkout_completed_at: string | null; updated_at: string }
export type OpsCheck = { id: string; booking_id: string; code: string; label: string; area: 'setup' | 'readiness' | 'checkout'; owner: string | null; notes: string | null; completed_at: string | null }
export type DamageDeposit = { booking_id: string; agreed_cents: number; received_cents: number; received_at: string | null; refunded_cents: number; refunded_at: string | null; retained_cents: number; notes: string | null; updated_at: string }
export type InspectionPhoto = { id: string; booking_id: string; object_path: string; caption: string | null; created_at: string }

export async function getBookingOperations(bookingId: string) {
  const [camp, cabin, vendors, contacts, profile, checks, deposit, photos] = await Promise.all([
    supabase.from('booking_camp_units').select('*').eq('booking_id', bookingId).order('arrival_on'),
    supabase.from('booking_cabin_stay').select('*').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_vendor_arrivals').select('*').eq('booking_id', bookingId).order('arrival_at'),
    supabase.from('booking_emergency_contacts').select('*').eq('booking_id', bookingId).order('created_at'),
    supabase.from('booking_ops_profile').select('*').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_ops_checks').select('*').eq('booking_id', bookingId).order('area'),
    supabase.from('booking_damage_deposit').select('*').eq('booking_id', bookingId).maybeSingle(),
    supabase.from('booking_inspection_photos').select('*').eq('booking_id', bookingId).order('created_at'),
  ])
  for (const result of [camp, cabin, vendors, contacts, profile, checks, deposit, photos]) if (result.error) throw result.error
  return {
    camp: (camp.data || []) as CampUnit[], cabin: cabin.data as CabinStay | null,
    vendors: (vendors.data || []) as VendorArrival[], contacts: (contacts.data || []) as EmergencyContact[],
    profile: profile.data as OpsProfile | null, checks: (checks.data || []) as OpsCheck[],
    deposit: deposit.data as DamageDeposit | null, photos: (photos.data || []) as InspectionPhoto[],
  }
}

export async function addCampUnit(data: Omit<CampUnit, 'id'>) {
  const { error } = await supabase.from('booking_camp_units').insert(data)
  if (error) throw error
}
export async function updateCampUnit(id: string, data: Omit<CampUnit, 'id'>) {
  const { error } = await supabase.from('booking_camp_units').update(data).eq('id', id)
  if (error) throw error
}
export async function removeCampUnit(id: string) {
  const { error } = await supabase.from('booking_camp_units').delete().eq('id', id)
  if (error) throw error
}
export async function saveCabinStay(data: CabinStay) {
  const { error } = await supabase.from('booking_cabin_stay').upsert(data, { onConflict: 'booking_id' })
  if (error) throw error
}
export async function addVendorArrival(data: Omit<VendorArrival, 'id'>) {
  const { error } = await supabase.from('booking_vendor_arrivals').insert(data)
  if (error) throw error
}
export async function removeVendorArrival(id: string) {
  const { error } = await supabase.from('booking_vendor_arrivals').delete().eq('id', id)
  if (error) throw error
}
export async function addEmergencyContact(data: Omit<EmergencyContact, 'id'>) {
  const { error } = await supabase.from('booking_emergency_contacts').insert(data)
  if (error) throw error
}
export async function removeEmergencyContact(id: string) {
  const { error } = await supabase.from('booking_emergency_contacts').delete().eq('id', id)
  if (error) throw error
}
export async function saveOpsProfile(data: Omit<OpsProfile, 'updated_at'>) {
  const { error } = await supabase.from('booking_ops_profile').upsert(data, { onConflict: 'booking_id' })
  if (error) throw error
}
export async function updateOpsCheck(id: string, data: Pick<OpsCheck, 'owner' | 'notes' | 'completed_at'>) {
  const { error } = await supabase.rpc('save_wedding_ops_check', {
    p_check_id: id, p_owner: data.owner, p_notes: data.notes, p_complete: Boolean(data.completed_at),
  })
  if (error) throw error
}
export async function saveDamageDeposit(data: Omit<DamageDeposit, 'updated_at'>) {
  const { error } = await supabase.from('booking_damage_deposit').upsert(data, { onConflict: 'booking_id' })
  if (error) throw error
}
export async function uploadInspectionPhoto(bookingId: string, file: File, caption: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image under 10 MB.')
  const suffix = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const objectPath = `${bookingId}/${crypto.randomUUID()}.${suffix}`
  const bucket = supabase.storage.from('wedding-inspections')
  const uploaded = await bucket.upload(objectPath, file, { contentType: file.type, upsert: false })
  if (uploaded.error) throw uploaded.error
  const { error } = await supabase.from('booking_inspection_photos').insert({ booking_id: bookingId, object_path: objectPath, caption: caption.trim() || null })
  if (error) {
    await bucket.remove([objectPath])
    throw error
  }
}
export async function getInspectionPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from('wedding-inspections').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
