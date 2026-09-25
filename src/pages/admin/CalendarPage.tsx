import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addMonths, endOfMonth, format, isAfter, isBefore, startOfMonth, startOfWeek } from 'date-fns'
import { useInquiries } from '@/hooks/useInquiries'
import {
  createCalendarBlackout,
  createCalendarHold,
  getCalendarBlocks,
  releaseCalendarBlock,
  type CalendarBlock,
} from '@/lib/supabase/queries/calendar'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function blockName(block: CalendarBlock, inquiryNames: Map<string, string>) {
  if (block.inquiry_id && inquiryNames.has(block.inquiry_id)) return inquiryNames.get(block.inquiry_id)
  return block.label || (block.kind === 'booking' ? 'Wedding' : block.kind)
}

function calendarError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === '23P01') return 'Those dates conflict with a booking, hold, blackout, or reset day.'
  return error instanceof Error ? error.message : 'Could not save the calendar change.'
}

export default function CalendarPage() {
  const queryClient = useQueryClient()
  const { data: blocks = [], isLoading, error } = useQuery({ queryKey: ['calendar-blocks'], queryFn: getCalendarBlocks })
  const { data: inquiries = [] } = useInquiries()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [kind, setKind] = useState<'hold' | 'blackout'>('hold')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expiresAt, setExpiresAt] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"))
  const [label, setLabel] = useState('')
  const [inquiryId, setInquiryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const inquiryNames = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry.full_name]))
  const gridStart = startOfWeek(month)
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!startDate || !endDate || endDate < startDate) {
      setFormError('Choose a valid start and end date.')
      return
    }
    if (kind === 'hold' && (!expiresAt || new Date(expiresAt).getTime() <= Date.now())) {
      setFormError('Choose a future expiry for the hold.')
      return
    }

    setSaving(true)
    try {
      if (kind === 'hold') {
        await createCalendarHold({
          startDate,
          endDate,
          expiresAt: new Date(expiresAt).toISOString(),
          label: label.trim(),
          inquiryId: inquiryId || null,
        })
      } else {
        await createCalendarBlackout({ startDate, endDate, label: label.trim() })
      }
      await queryClient.invalidateQueries({ queryKey: ['calendar-blocks'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-attention'] })
      setLabel('')
      setStartDate('')
      setEndDate('')
      setInquiryId('')
    } catch (caught) {
      setFormError(calendarError(caught))
    } finally {
      setSaving(false)
    }
  }

  const release = async (block: CalendarBlock) => {
    if (!window.confirm(`Release this ${block.kind}: ${blockName(block, inquiryNames)}?`)) return
    try {
      await releaseCalendarBlock(block.id)
      await queryClient.invalidateQueries({ queryKey: ['calendar-blocks'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-attention'] })
    } catch (caught) {
      setFormError(calendarError(caught))
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Venue Calendar</h1>
        <p className="mt-1 text-sm text-slate-600">One wedding at a time. Holds expire automatically; bookings need a full reset day.</p>
      </header>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="rounded border px-3 py-1 text-sm">Previous</button>
          <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="rounded border px-3 py-1 text-sm">Next</button>
        </div>
        {isLoading ? <p>Loading calendar…</p> : null}
        {error ? <p className="text-red-700">Could not load calendar. Please refresh before making a booking.</p> : null}
        {!isLoading && !error ? (
          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((day) => <div key={day} className="py-1 text-center text-xs font-semibold text-slate-500">{day}</div>)}
            {days.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const todayBlocks = blocks.filter((block) => key >= block.start_date && key <= block.end_date)
              const reset = blocks.some((block) => block.kind !== 'blackout' &&
                key === format(addDays(new Date(`${block.end_date}T12:00:00`), 1), 'yyyy-MM-dd'))
              return (
                <div key={key} className={`min-h-24 rounded border p-1 text-xs ${isBefore(date, month) || isAfter(date, endOfMonth(month)) ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}>
                  <span className="font-semibold">{format(date, 'd')}</span>
                  {todayBlocks.map((block) => (
                    <div key={block.id} className={`mt-1 truncate rounded px-1 py-0.5 ${block.kind === 'booking' ? 'bg-emerald-100 text-emerald-900' : block.kind === 'hold' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'}`} title={blockName(block, inquiryNames)}>
                      {block.kind}: {blockName(block, inquiryNames)}
                    </div>
                  ))}
                  {reset && !todayBlocks.length ? <div className="mt-1 rounded bg-orange-50 px-1 py-0.5 text-orange-800">Reset day</div> : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Reserve dates</h2>
          <label className="block text-sm">Type
            <select value={kind} onChange={(event) => setKind(event.target.value as 'hold' | 'blackout')} className="mt-1 w-full rounded border p-2">
              <option value="hold">Pending hold</option>
              <option value="blackout">Owner blackout</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Start date<input type="date" required value={startDate} onChange={(event) => { setStartDate(event.target.value); if (!endDate) setEndDate(event.target.value) }} className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Last date<input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          </div>
          {kind === 'hold' ? (
            <>
              <label className="block text-sm">Expires<input type="datetime-local" required value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
              <label className="block text-sm">Inquiry
                <select value={inquiryId} onChange={(event) => setInquiryId(event.target.value)} className="mt-1 w-full rounded border p-2">
                  <option value="">No linked inquiry</option>
                  {inquiries.map((inquiry) => <option key={inquiry.id} value={inquiry.id}>{inquiry.full_name}</option>)}
                </select>
              </label>
            </>
          ) : null}
          <label className="block text-sm">Label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={kind === 'hold' ? 'Couple or reason' : 'Reason for blackout'} className="mt-1 w-full rounded border p-2" /></label>
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          <button disabled={saving || Boolean(error)} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : kind === 'hold' ? 'Create hold' : 'Create blackout'}</button>
        </form>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Active reservations</h2>
          {blocks.length === 0 ? <p className="text-sm text-slate-500">No bookings, holds, or blackouts yet.</p> : null}
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
                <div>
                  <div className="font-medium">{blockName(block, inquiryNames)} <span className="text-slate-500">· {block.kind}</span></div>
                  <div className="text-slate-600">{block.start_date} – {block.end_date}{block.expires_at ? ` · expires ${new Date(block.expires_at).toLocaleString()}` : ''}</div>
                </div>
                {block.kind !== 'booking' ? <button type="button" onClick={() => release(block)} className="rounded border px-2 py-1 text-xs">Release</button> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
