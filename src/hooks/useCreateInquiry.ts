import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createInquiry } from '@/lib/supabase/queries/inquiries'

export function useCreateInquiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}
