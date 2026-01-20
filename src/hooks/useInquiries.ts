import { useQuery } from '@tanstack/react-query'
import { getInquiries } from '@/lib/supabase/queries/inquiries'

export function useInquiries() {
  return useQuery({ queryKey: ['inquiries'], queryFn: getInquiries })
}
