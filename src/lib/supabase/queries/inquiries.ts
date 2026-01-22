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
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch {
    const { data } = await supabase.from('inquiries').select('*')
    return (data || []).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ) as Inquiry[]
  }
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
