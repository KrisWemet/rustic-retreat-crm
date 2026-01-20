import { supabase } from '@/lib/supabase/client'

export type Inquiry = {
  id: string
  full_name: string
  email: string
  phone: string | null
  wedding_date_estimate: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type CreateInquiryInput = {
  full_name: string
  email: string
  phone: string
  wedding_date_estimate?: string | null
  source?: string | null
  notes?: string | null
}

export async function getInquiries(): Promise<Inquiry[]> {
  const { data } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  return data || []
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
