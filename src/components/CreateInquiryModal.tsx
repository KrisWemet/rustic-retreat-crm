import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateInquiry } from '@/hooks/useCreateInquiry'

const inquirySchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Phone is required'),
  wedding_date_estimate: z.string().optional().or(z.literal('')),
  source: z.string().min(1, 'Source is required'),
  notes: z.string().optional().or(z.literal('')),
})

type InquiryFormValues = z.infer<typeof inquirySchema>

type CreateInquiryModalProps = {
  open: boolean
  onClose: () => void
  onSuccess?: (message: string) => void
}

const CreateInquiryModal = ({
  open,
  onClose,
  onSuccess,
}: CreateInquiryModalProps) => {
  const [formError, setFormError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useCreateInquiry()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      wedding_date_estimate: '',
      source: 'Website',
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
      setFormError(null)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open, reset])

  if (!open) {
    return null
  }

  const onSubmit = async (values: InquiryFormValues) => {
    setFormError(null)

    try {
      await mutateAsync({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        wedding_date_estimate: values.wedding_date_estimate || null,
        source: values.source,
        notes: values.notes || null,
      })
      onClose()
      onSuccess?.('Inquiry created successfully.')
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      } else {
        setFormError('Unable to create inquiry. Please try again.')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              New Inquiry
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture a new lead and keep everything organized.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              {...register('full_name')}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Alex Johnson"
            />
            {errors.full_name ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.full_name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              {...register('email')}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="alex@example.com"
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              {...register('phone')}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="(555) 123-4567"
            />
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Wedding Date Estimate
            </label>
            <input
              {...register('wedding_date_estimate')}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Spring 2026"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Source</label>
            <select
              {...register('source')}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Website">Website</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Referral">Referral</option>
              <option value="Other">Other</option>
            </select>
            {errors.source ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.source.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Add any helpful context..."
            />
          </div>

          {formError ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? 'Saving...' : 'Create Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateInquiryModal
