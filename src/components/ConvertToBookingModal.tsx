import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import { Button } from '@/components/ui/button'
import { computeEndDate, getFiveDayWindowOptions, receptionOverageTotalCents, validateCapacity, validatePackageWindow, validateReceptionOverageRate, validateResetRule, validateRvCount, type PackageType } from '@/lib/validators/booking'
import { confirmBookingFromInquiry } from '@/lib/supabase/queries/bookings'
import { getCalendarBlocks, type CalendarBlock } from '@/lib/supabase/queries/calendar'
import { useToast } from '@/components/ui/toast-context'
import { useState, useEffect as useReactEffect } from 'react'
import { getPackageTerms } from '@/lib/packageCatalog'
import { useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  package: z.enum(['three_day', 'five_day']),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  guest_reception_count: z.coerce.number().min(0),
  guest_camping_count: z.coerce.number().min(0),
  rv_count: z.coerce.number().min(0),
  reception_overage_rate_dollars: z.coerce.number().min(0),
})

type Values = z.infer<typeof schema>

import { motion, AnimatePresence } from 'framer-motion'

export default function ConvertToBookingModal({ inquiry, open, onClose }: { inquiry: Inquiry | null; open: boolean; onClose: () => void }) {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const [existing, setExisting] = useState<CalendarBlock[]>([])
  const [windowErrMsg, setWindowErrMsg] = useState<string | null>(null)
  const [resetErrMsg, setResetErrMsg] = useState<string | null>(null)
  const [capErrMsg, setCapErrMsg] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      package: 'three_day',
      start_date: '',
      end_date: '',
      guest_reception_count: 0,
      guest_camping_count: 0,
      rv_count: 0,
      reception_overage_rate_dollars: 0,
    },
  })

  useEffect(() => {
    if (!open || !inquiry) return
    const estimate = Number(inquiry.estimated_guests)
    reset({ package: 'three_day', start_date: '', end_date: '',
      guest_reception_count: Number.isInteger(estimate) && estimate >= 0 && estimate <= 100 ? estimate : 0,
      guest_camping_count: 0, rv_count: 0, reception_overage_rate_dollars: 0 })
  }, [open, inquiry, reset])

  const pkg = watch('package')
  const start = watch('start_date')
  const end = watch('end_date')
  const rec = watch('guest_reception_count')
  const camp = watch('guest_camping_count')
  const rvs = watch('rv_count')
  const overageRateDollars = watch('reception_overage_rate_dollars')
  const overageRateCents = Math.round(Number(overageRateDollars || 0) * 100)
  const terms = start ? getPackageTerms(pkg, start) : null
  const fiveDayOptions = pkg === 'five_day' && start && !availabilityError && !availabilityLoading
    ? getFiveDayWindowOptions(start, existing, inquiry?.id)
    : []

  useEffect(() => {
    if (pkg && start) {
      setValue('end_date', computeEndDate(pkg as PackageType, start))
    }
  }, [pkg, start, setValue])

  // Preview confirmed bookings, holds, and blackouts. The database makes the final decision.
  useReactEffect(() => {
    if (!open) return
    setAvailabilityError(false)
    setAvailabilityLoading(true)
    getCalendarBlocks()
      .then((rows) => setExisting(rows))
      .catch(() => setAvailabilityError(true))
      .finally(() => setAvailabilityLoading(false))
  }, [open])

  // Live validation messages
  useReactEffect(() => {
    setWindowErrMsg(start && end && pkg ? validatePackageWindow(pkg as PackageType, start, end) : null)
  }, [pkg, start, end])
  useReactEffect(() => {
    setResetErrMsg(start && end ? validateResetRule(start, end, existing, inquiry?.id) : null)
  }, [start, end, existing, inquiry?.id])
  useReactEffect(() => {
    setCapErrMsg(validateCapacity(Number(rec || 0), Number(camp || 0)))
  }, [rec, camp])

  if (!open || !inquiry) return null

  const onSubmit = async (values: Values) => {
    // validators
    const packageTerms = getPackageTerms(values.package, values.start_date)
    if (!packageTerms) return show('No published package price for this season. Add approved terms before booking.')
    const windowErr = validatePackageWindow(values.package, values.start_date, values.end_date)
    if (windowErr) return show(windowErr)
    const capErr = validateCapacity(values.guest_reception_count, values.guest_camping_count)
    if (capErr) return show(capErr)
    const rvErr = validateRvCount(values.rv_count)
    if (rvErr) return show(rvErr)
    const rateCents = Math.round(values.reception_overage_rate_dollars * 100)
    const overageErr = validateReceptionOverageRate(values.guest_reception_count, rateCents)
    if (overageErr) return show(overageErr)

    try {
      const existingRows = await getCalendarBlocks()
      const resetErr = validateResetRule(values.start_date, values.end_date, existingRows, inquiry.id)
      if (resetErr) return show(resetErr)

      await confirmBookingFromInquiry({
        inquiry_id: inquiry.id,
        package: values.package,
        package_terms: packageTerms,
        start_date: values.start_date,
        end_date: values.end_date,
        guest_reception_count: values.guest_reception_count,
        guest_camping_count: values.guest_camping_count,
        rv_count: values.rv_count,
        reception_overage_rate_cents: values.guest_reception_count > 80 ? rateCents : null,
      })
      await queryClient.invalidateQueries({ queryKey: ['inquiries'] })
      await queryClient.invalidateQueries({ queryKey: ['bookings'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar-blocks'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-attention'] })
      await queryClient.invalidateQueries({ queryKey: ['financial-overview'] })
      show('Booking created')
      onClose()
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      if (code === '23P01' || code === '23505') {
        show('Those dates were just taken by a booking, hold, or blackout. Choose another window.')
        getCalendarBlocks().then(setExisting).catch(() => setAvailabilityError(true))
      } else {
        setAvailabilityError(true)
        show('Could not verify availability or create the booking. Please try again.')
      }
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
          className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--brand-accent)]/70 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="heading-serif text-xl font-semibold text-[var(--brand-text)]">Convert to Booking</h2>
          <p className="mt-1 text-sm text-[var(--brand-text)]/70">Select package and dates. Rules are enforced automatically.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--brand-text)]">Package</label>
            <select {...register('package')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]">
              <option value="three_day">3-Day (Fri–Sun)</option>
              <option value="five_day">5-Day (Wed–Sun / Thu–Mon / Fri–Tue)</option>
            </select>
            {terms ? (
              <p className="mt-2 text-sm text-[var(--brand-text)]/70">
                {terms.season} package: ${(terms.basePriceCents / 100).toLocaleString('en-CA')} CAD plus GST.
                Reception seating for {terms.includedReceptionGuests} and camping for up to {terms.includedCampingGuests} guests are included.
                Hard reception cap: {terms.maximumReceptionGuests}. {terms.includedRvs} RVs included;
                maximum {terms.maximumRvs} RVs on site. Additional RV fees follow the signed contract.
              </p>
            ) : start ? (
              <p className="mt-2 text-sm text-red-600">No approved package price for this season.</p>
            ) : null}
            <p className="mt-1 text-xs text-[var(--brand-text)]/70">Available date windows depend on nearby bookings and reset days.</p>
          </div>

          {availabilityLoading ? <p className="text-sm text-[var(--brand-text)]/70">Checking nearby bookings…</p> : null}
          {availabilityError ? <p className="text-sm text-red-600">Could not check nearby bookings. Try again before confirming a date.</p> : null}

          <div>
            <label className="text-sm font-medium text-[var(--brand-text)]">Estimated RVs</label>
            <input type="number" min={0} max={15} {...register('rv_count')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)]" />
            <p className="mt-1 text-xs text-[var(--brand-text)]/70">
              8 included, 15 maximum. Additional RV pricing follows the contract.
            </p>
            {validateRvCount(Number(rvs || 0)) ? <p className="mt-1 text-xs text-red-600">{validateRvCount(Number(rvs || 0))}</p> : null}
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

          {fiveDayOptions.length > 0 ? (
            <div className="rounded-lg border border-[var(--brand-accent)]/70 p-3">
              <p className="mb-2 text-sm font-medium text-[var(--brand-text)]">5-day options for this wedding weekend</p>
              <div className="flex flex-wrap gap-2">
                {fiveDayOptions.map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant="secondary"
                    disabled={!option.available}
                    onClick={() => setValue('start_date', option.startDate)}
                  >
                    {option.label}: {option.available ? 'Available' : 'Booked/reset'}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

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
                        {b.start_date} — {b.end_date}
                      </span>
                      <span className="text-xs text-[var(--brand-text)]/60">{b.kind}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Reception Guests</label>
              <input type="number" min={0} max={100} {...register('guest_reception_count')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
              {capErrMsg ? <p className="mt-1 text-xs text-red-600">{capErrMsg}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Camping Guests</label>
              <input type="number" min={0} {...register('guest_camping_count')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)] focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
          </div>

          {Number(rec || 0) > 80 ? (
            <div>
              <label className="text-sm font-medium text-[var(--brand-text)]">Agreed fee per guest above 80 (CAD)</label>
              <input type="number" min={0.01} step={0.01} {...register('reception_overage_rate_dollars')} className="mt-2 w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2 text-sm text-[var(--brand-text)]" />
              <p className="mt-1 text-xs text-[var(--brand-text)]/70">
                {Math.max(0, Number(rec || 0) - 80)} extra guests · ${((receptionOverageTotalCents(Number(rec || 0), overageRateCents)) / 100).toFixed(2)} total at this rate.
              </p>
              {validateReceptionOverageRate(Number(rec || 0), overageRateCents) ? (
                <p className="mt-1 text-xs text-red-600">Enter the agreed fee before creating this booking.</p>
              ) : null}
            </div>
          ) : null}

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
