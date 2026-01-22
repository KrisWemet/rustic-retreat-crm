import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDeleteInquiry } from '@/hooks/useDeleteInquiry'
import { useUpdateInquiry } from '@/hooks/useUpdateInquiry'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'

const statusClasses: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  viewing_scheduled: 'bg-yellow-100 text-yellow-800',
  viewed: 'bg-purple-100 text-purple-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
}

const inquirySchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Phone is required'),
  wedding_date_estimate: z.string().optional().or(z.literal('')),
  source: z.string().min(1, 'Source is required'),
  notes: z.string().optional().or(z.literal('')),
  status: z.string().optional(),
})

type InquiryFormValues = z.infer<typeof inquirySchema>

type InquiryDetailModalProps = {
  inquiry: Inquiry | null
  open: boolean
  onClose: () => void
  onConvertToBooking?: (inq: Inquiry) => void
}

const InquiryDetailModal = ({
  inquiry,
  open,
  onClose,
  onConvertToBooking,
}: InquiryDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [currentInquiry, setCurrentInquiry] = useState<Inquiry | null>(null)
  const updateMutation = useUpdateInquiry()
  const deleteMutation = useDeleteInquiry()
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
      status: 'new',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
      setIsEditing(false)
      setFormError(null)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open, reset])

  useEffect(() => {
    if (inquiry) {
      reset({
        full_name: inquiry.full_name ?? '',
        email: inquiry.email ?? '',
        phone: inquiry.phone ?? '',
        wedding_date_estimate: inquiry.wedding_date_estimate ?? '',
        source: inquiry.source ?? 'Website',
        notes: inquiry.notes ?? '',
        status: inquiry.status ?? 'new',
      })
      setCurrentInquiry(inquiry)
    }
  }, [inquiry, reset])

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || !inquiry) {
    return null
  }

  const activeInquiry = currentInquiry ?? inquiry

  const handleUpdate = async (values: InquiryFormValues) => {
    setFormError(null)
    try {
      const updatedInquiry = await updateMutation.mutateAsync({
        id: inquiry.id,
        data: {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone,
          wedding_date_estimate: values.wedding_date_estimate || null,
          source: values.source,
          notes: values.notes || null,
          status: (values.status || 'new') as any,
        },
      })
      setCurrentInquiry(updatedInquiry)
      setIsEditing(false)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to update inquiry. Please try again.',
      )
    }
  }

  const handleDelete = async () => {
    setFormError(null)
    try {
      await deleteMutation.mutateAsync(inquiry.id)
      onClose()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to delete inquiry. Please try again.',
      )
    }
  }

  const statusKey = activeInquiry.status ?? 'new'
  const badgeClass = statusClasses[statusKey] ?? 'bg-gray-100 text-gray-800'

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isEditing ? 'Edit Inquiry' : 'Inquiry Details'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditing
                ? 'Update the inquiry details below.'
                : 'Review the inquiry information.'}
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

        {formError ? (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        {isEditing ? (
          <form
            onSubmit={handleSubmit(handleUpdate)}
            className="mt-6 flex-1 overflow-y-auto space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                {...register('status')}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="new">New</option>
                <option value="viewing_scheduled">Viewing Scheduled</option>
                <option value="viewed">Viewed</option>
                <option value="booked">Booked</option>
                <option value="lost">Lost</option>
                <option value="inquiry">Inquiry</option>
                <option value="tour_scheduled">Tour Scheduled</option>
                <option value="approved">Approved</option>
                <option value="contract_sent">Contract Sent</option>
                <option value="contract_signed">Contract Signed</option>
                <option value="booking_confirmed">Booking Confirmed</option>
                <option value="pre_event_checklist">Pre-Event Checklist</option>
                <option value="event_week">Event Week</option>
                <option value="post_event_inspection">Post-Event Inspection</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                {...register('full_name')}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
              />
            </div>

          </form>
        ) : (
          <div className="mt-6 flex-1 overflow-y-auto space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Full Name
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {activeInquiry.full_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
              >
                {statusKey.replace('_', ' ')}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Email
                </p>
                <p className="mt-1 text-base text-slate-900">
                  {activeInquiry.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Phone
                </p>
                <p className="mt-1 text-base text-slate-900">
                  {activeInquiry.phone ?? '—'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Wedding Date Estimate
                </p>
                <p className="mt-1 text-base text-slate-900">
                  {activeInquiry.wedding_date_estimate ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Source
                </p>
                <p className="mt-1 text-base text-slate-900">
                  {activeInquiry.source ?? '—'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Notes
              </p>
              <div className="relative mt-2 rounded-xl border border-[var(--brand-accent)] bg-[var(--brand-cream)] p-4">
                <span className="pointer-events-none absolute -top-5 left-4 text-6xl font-serifDisplay text-[var(--brand-accent)]/70">“</span>
                <p className="relative whitespace-pre-line text-base text-[var(--brand-text)]">
                  {activeInquiry.notes ?? '—'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Created
              </p>
              <p className="mt-1 text-base text-slate-900">
                {new Date(activeInquiry.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Inquiry ID
              </p>
              <p className="mt-1 text-base text-slate-900">
                {activeInquiry.id}
              </p>
            </div>
          </div>
        )}

        {!isEditing ? (
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            {activeInquiry.status !== 'booking_confirmed' && onConvertToBooking ? (
              <button
                type="button"
                onClick={() => onConvertToBooking(activeInquiry)}
                className="px-4 py-2 rounded-full font-medium bg-[var(--brand-terracotta)] text-white hover:opacity-90"
              >
                Convert to Booking
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  'Are you sure you want to delete this inquiry?',
                )
                if (!confirmed) return
                await handleDelete()
              }}
              className="px-4 py-2 rounded-md font-medium bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-75"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-medium bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-md font-medium bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit(handleUpdate)}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InquiryDetailModal
