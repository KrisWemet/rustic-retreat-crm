import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
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
const localDateTime = (value: string | null) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''
const bookedStatuses = new Set(['booked', 'booking_confirmed', 'pre_event_checklist', 'event_week', 'post_event_inspection'])

const inquirySchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  partner_name: z.string().optional(),
  preferred_contact: z.string().optional(),
  preferred_contact_email: z.string().email('Enter a valid reminder email').optional().or(z.literal('')),
  estimated_guests: z.string().optional(),
  preferred_tour_dates: z.string().optional(),
  last_contacted_at: z.string().optional(),
  next_follow_up_at: z.string().optional(),
  tour_at: z.string().optional(),
  tour_outcome: z.string().optional(),
  lost_reason: z.string().optional(),
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
  const close = useCallback(() => { setIsEditing(false); setFormError(null); setCurrentInquiry(null); onClose() }, [onClose])
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
      preferred_contact_email: '',
      partner_name: '', preferred_contact: '', estimated_guests: '', preferred_tour_dates: '',
      last_contacted_at: '', next_follow_up_at: '', tour_at: '', tour_outcome: '', lost_reason: '',
      wedding_date_estimate: '',
      source: 'Website',
      notes: '',
      status: 'new',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, open, reset])

  useEffect(() => {
    if (inquiry) {
      reset({
        full_name: inquiry.full_name ?? '',
        email: inquiry.email ?? '',
        phone: inquiry.phone ?? '',
        partner_name: inquiry.partner_name ?? '',
        preferred_contact: inquiry.preferred_contact ?? '',
        preferred_contact_email: inquiry.preferred_contact_email ?? '',
        estimated_guests: inquiry.estimated_guests ?? '',
        preferred_tour_dates: inquiry.preferred_tour_dates ?? '',
        last_contacted_at: localDateTime(inquiry.last_contacted_at),
        next_follow_up_at: localDateTime(inquiry.next_follow_up_at),
        tour_at: localDateTime(inquiry.tour_at),
        tour_outcome: inquiry.tour_outcome ?? '',
        lost_reason: inquiry.lost_reason ?? '',
        wedding_date_estimate: inquiry.wedding_date_estimate ?? '',
        source: inquiry.source ?? 'Website',
        notes: inquiry.notes ?? '',
        status: inquiry.status ?? 'new',
      })
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

  const activeInquiry = currentInquiry?.id === inquiry.id ? currentInquiry : inquiry

  const handleUpdate = async (values: InquiryFormValues) => {
    setFormError(null)
    try {
      const updatedInquiry = await updateMutation.mutateAsync({
        id: inquiry.id,
        data: {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          partner_name: values.partner_name || null,
          preferred_contact: values.preferred_contact || null,
          preferred_contact_email: values.preferred_contact_email || null,
          estimated_guests: values.estimated_guests || null,
          preferred_tour_dates: values.preferred_tour_dates || null,
          last_contacted_at: values.last_contacted_at ? new Date(values.last_contacted_at).toISOString() : null,
          next_follow_up_at: values.next_follow_up_at ? new Date(values.next_follow_up_at).toISOString() : null,
          tour_at: values.tour_at ? new Date(values.tour_at).toISOString() : null,
          tour_outcome: values.tour_outcome || null,
          lost_reason: values.lost_reason || null,
          wedding_date_estimate: values.wedding_date_estimate || null,
          source: values.source,
          notes: values.notes || null,
          status: values.status || 'new',
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
      close()
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
      onClick={close}
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
            onClick={close}
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
                <option value="viewing_scheduled">First Contact</option>
                <option value="viewed">Tour Completed</option>
                <option value="lost">Lost</option>
                <option value="tour_scheduled">Tour Scheduled</option>
                <option value="approved">Qualified</option>
                <option value="contract_sent">Contract Sent</option>
                <option value="contract_signed">Contract Signed</option>
                {bookedStatuses.has(activeInquiry.status ?? '') && <option value={activeInquiry.status ?? ''}>{(activeInquiry.status ?? '').replaceAll('_', ' ')}</option>}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">Partner's name<input {...register('partner_name')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Preferred contact<select {...register('preferred_contact')} className="mt-1 w-full rounded-md border p-2"><option value="">Not specified</option><option value="email">Email</option><option value="text">Text</option><option value="phone">Phone call</option></select></label>
              <label className="text-sm">Reminder email (optional)<input type="email" {...register('preferred_contact_email')} placeholder="Uses primary email when blank" className="mt-1 w-full rounded-md border p-2" />{errors.preferred_contact_email && <span className="text-red-700">{errors.preferred_contact_email.message}</span>}</label>
              <label className="text-sm">Estimated guests<input {...register('estimated_guests')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Preferred tour dates<input {...register('preferred_tour_dates')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Last contacted<input type="datetime-local" {...register('last_contacted_at')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Next follow-up<input type="datetime-local" {...register('next_follow_up_at')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Tour appointment<input type="datetime-local" {...register('tour_at')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Tour outcome<input {...register('tour_outcome')} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Lost reason<input {...register('lost_reason')} className="mt-1 w-full rounded-md border p-2" /></label>
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
              <p>Partner: {activeInquiry.partner_name || '—'}</p><p>Preferred contact: {activeInquiry.preferred_contact || '—'}</p>
              <p>Estimated guests: {activeInquiry.estimated_guests || '—'}</p><p>Tour dates requested: {activeInquiry.preferred_tour_dates || '—'}</p>
              <p>Last contacted: {activeInquiry.last_contacted_at ? new Date(activeInquiry.last_contacted_at).toLocaleString() : '—'}</p>
              <p>Next follow-up: {activeInquiry.next_follow_up_at ? new Date(activeInquiry.next_follow_up_at).toLocaleString() : '—'}</p>
              <p>Tour appointment: {activeInquiry.tour_at ? new Date(activeInquiry.tour_at).toLocaleString() : '—'}</p>
              <p>Tour outcome: {activeInquiry.tour_outcome || '—'}</p>
              <p>Lost reason: {activeInquiry.lost_reason || '—'}</p>
              <p>Inquiry type: {activeInquiry.inquiry_type || '—'}</p>
              <p>Landing source: {activeInquiry.landing_source || '—'}</p>
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
            {!bookedStatuses.has(activeInquiry.status ?? '') && onConvertToBooking ? (
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
              onClick={close}
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
