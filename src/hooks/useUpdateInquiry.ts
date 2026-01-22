import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateInquiry } from '@/lib/supabase/queries/inquiries'

type UpdateInquiryArgs = {
  id: string
  data: Parameters<typeof updateInquiry>[1]
}

export function useUpdateInquiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: UpdateInquiryArgs) => updateInquiry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}
