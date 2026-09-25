import { supabase } from '@/lib/supabase/client'

export type CalendarBlock = {
  id: string
  booking_id: string | null
  inquiry_id: string | null
  kind: 'booking' | 'hold' | 'blackout'
  state: 'active' | 'released' | 'expired'
  start_date: string
  end_date: string
  expires_at: string | null
  label: string
  created_at: string
}

export async function getCalendarBlocks(): Promise<CalendarBlock[]> {
  const { data, error } = await supabase.rpc('get_active_calendar_blocks')
  if (error) throw error
  return (data || []) as CalendarBlock[]
}

export async function createCalendarHold(input: {
  startDate: string
  endDate: string
  expiresAt: string
  label: string
  inquiryId: string | null
}): Promise<CalendarBlock> {
  const { data, error } = await supabase.rpc('create_calendar_hold', {
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_expires_at: input.expiresAt,
    p_label: input.label,
    p_inquiry_id: input.inquiryId,
  })
  if (error) throw error
  return data as CalendarBlock
}

export async function createCalendarBlackout(input: {
  startDate: string
  endDate: string
  label: string
}): Promise<CalendarBlock> {
  const { data, error } = await supabase.rpc('create_calendar_blackout', {
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_label: input.label,
  })
  if (error) throw error
  return data as CalendarBlock
}

export async function releaseCalendarBlock(id: string): Promise<void> {
  const { error } = await supabase.rpc('release_calendar_block', { p_block_id: id })
  if (error) throw error
}
