import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteInquiry } from '@/lib/supabase/queries/inquiries'

export function useDeleteInquiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-attention'] })
    },
  })
}
