import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import { Button } from '@/components/ui/button'
import { computeEndDate, validateCapacity, validatePackageWindow, validateResetRule, type PackageType } from '@/lib/validators/booking'
import { createBooking, getBookings } from '@/lib/supabase/queries/bookings'
import { useToast } from '@/components/ui/toast'
import { useUpdateInquiry } from '@/hooks/useUpdateInquiry'
import { useState, useEffect as useReactEffect } from 'react'

const schema = z.object({
  package: z.enum(['two_day', 'three_day', 'five_day']),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  guest_reception_count: z.coerce.number().min(0),
  guest_camping_count: z.coerce.number().min(0),
})

type Values = z.infer<typeof schema>

import { motion, AnimatePresence } from 'framer-motion'

export default function ConvertToBookingModal({ inquiry, open, onClose }: { inquiry: Inquiry | null; open: boolean; onClose: () => void }) {
  const { show } = useToast()
  const updateInquiry = useUpdateInquiry()
  const [existing, setExisting] = useState<{ id: string; start_date: string; end_date: string }[]>([])
  const [windowErrMsg, setWindowErrMsg] = useState<string | null>(null)
  const [resetErrMsg, setResetErrMsg] = useState<string | null>(null)
  const [capErrMsg, setCapErrMsg] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      package: 'three_day',
      start_date: '',
      end_date: '',
      guest_reception_count: 0,
      guest_camping_count: 0,
    },
  })

  const pkg = watch('package')
  const start = watch('start_date')
  const end = watch('end_date')
  const rec = watch('guest_reception_count')
  const camp = watch('guest_camping_count')

  useEffect(() => {
    if (pkg && start) {
      setValue('end_date', computeEndDate(pkg as PackageType, start))
    }
  }, [pkg, start, setValue])

  // Prefetch existing bookings for reset validation
  useReactEffect(() => {
    if (!open) return
    getBookings().then((rows) => setExisting(rows))
  }, [open])

  // Live validation messages
  useReactEffect(() => {
    setWindowErrMsg(start && end && pkg ? validatePackageWindow(pkg as PackageType, start, end) : null)
  }, [pkg, start, end])
  useReactEffect(() => {
    setResetErrMsg(start && end ? validateResetRule(start, end, existing) : null)
  }, [start, end, existing])
  useReactEffect(() => {
    setCapErrMsg(validateCapacity(Number(rec || 0), Number(camp || 0)))
  }, [rec, camp])

  if (!open || !inquiry) return null

  const onSubmit = async (values: Values) => {
    // validators
    const windowErr = validatePackageWindow(values.package, values.start_date, values.end_date)
    if (windowErr) return show(windowErr)
    const capErr = validateCapacity(values.guest_reception_count, values.guest_camping_count)
    if (capErr) return show(capErr)

    const existingRows = await getBookings()
    const resetErr = validateResetRule(values.start_date, values.end_date, existingRows)
    if (resetErr) return show(resetErr)

    try {
      await createBooking({
        inquiry_id: inquiry.id,
        client_user_id: null,
        package: values.package,
        start_date: values.start_date,
        end_date: values.end_date,
        guest_reception_count: values.guest_reception_count,
        guest_camping_count: values.guest_camping_count,
      })
      // Update inquiry status to booking_confirmed
      await updateInquiry.mutateAsync({ id: inquiry.id, data: { status: 'booking_confirmed' as any } })
      show('Booking created')
      onClose()
    } catch (e) {
      show('Failed to create booking')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-lg rounded-2xl border border-[var(--brand-accent)]/70 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="heading-serif text-xl font-semibold text-[var(--brand-text)]">Convert to Booking</h2>
          <p className="mt-1 text-sm text-[var(--brand-text)]/70">Select package and dates. Rules are enforced automatically.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--brand-text)]">Package</label>
            <select {...register('package')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]">
              <option value="two_day">2-Day (Tue–Thu)</option>
              <option value="three_day">3-Day (Fri–Sun)</option>
              <option value="five_day">5-Day (Wed–Mon / Thu–Tue)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Start Date</label>
              <input type="date" {...register('start_date')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
              {windowErrMsg ? <p className="mt-1 text-xs text-red-600">{windowErrMsg}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">End Date</label>
              <input type="date" {...register('end_date')} readOnly className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-[var(--brand-cream)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              {resetErrMsg ? <p className="mt-1 text-xs text-red-600">{resetErrMsg}</p> : null}
            </div>
          </div>

          {resetErrMsg ? (
            <div className="rounded-xl border border-[var(--brand-accent)]/70 bg-white/70 p-3 text-sm text-[var(--brand-text)]/80">
              <div className="mb-1 font-medium text-[var(--brand-text)]">Nearby bookings</div>
              <ul className="space-y-1">
                {existing
                  .slice()
                  .sort((a, b) =>
                    Math.abs(new Date(a.start_date).getTime() - new Date(start || a.start_date).getTime()) -
                    Math.abs(new Date(b.start_date).getTime() - new Date(start || b.start_date).getTime()),
                  )
                  .slice(0, 3)
                  .map((b) => (
                    <li key={b.id} className="flex items-center justify-between">
                      <span>
                        {new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[var(--brand-text)]/60">booked</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Reception Guests</label>
              <input type="number" min={0} {...register('guest_reception_count')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
              {capErrMsg ? <p className="mt-1 text-xs text-red-600">{capErrMsg}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Camping Guests</label>
              <input type="number" min={0} {...register('guest_camping_count')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Booking'}
            </Button>
          </div>
        </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
