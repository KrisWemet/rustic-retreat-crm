import { supabase } from '@/lib/supabase/client'

export type Inquiry = {
  id: string
  full_name: string
  email: string
  phone: string | null
  partner_name: string | null
  preferred_contact: string | null
  preferred_contact_email: string | null
  estimated_guests: string | null
  preferred_tour_dates: string | null
  inquiry_type: string | null
  landing_source: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  tour_at: string | null
  tour_outcome: string | null
  lost_reason: string | null
  status_changed_at: string | null
  external_submission_id: string | null
  wedding_date_estimate: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type CreateInquiryInput = {
  full_name: string
  email: string
  phone?: string | null
  partner_name?: string | null
  preferred_contact?: string | null
  estimated_guests?: string | null
  preferred_tour_dates?: string | null
  inquiry_type?: string | null
  landing_source?: string | null
  last_contacted_at?: string | null
  next_follow_up_at?: string | null
  tour_at?: string | null
  tour_outcome?: string | null
  lost_reason?: string | null
  wedding_date_estimate?: string | null
  source?: string | null
  notes?: string | null
}

export async function getInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Inquiry[]
}

export async function createInquiry(
  data: CreateInquiryInput,
): Promise<Inquiry> {
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert([data])
    .select()
    .single()

  if (error) {
    throw error
  }

  return inquiry
}

export async function updateInquiry(
  id: string,
  data: Partial<Inquiry>,
): Promise<Inquiry> {
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return inquiry
}

export async function deleteInquiry(id: string): Promise<void> {
  const { error } = await supabase.from('inquiries').delete().eq('id', id)

  if (error) {
    throw error
  }
}
