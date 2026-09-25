import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getInquiries } from '@/lib/supabase/queries/inquiries'
import { getBookings } from '@/lib/supabase/queries/bookings'
import { getCalendarBlocks } from '@/lib/supabase/queries/calendar'
import { getWorkspaceAttention } from '@/lib/supabase/queries/workspace'
import { getBookingOperations } from '@/lib/supabase/queries/operations'

const DAY = 86400000
const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard-attention'], refetchInterval: 60000, queryFn: async () => {
    const [inquiries, bookings, blocks, attention] = await Promise.all([getInquiries(), getBookings(), getCalendarBlocks(), getWorkspaceAttention()])
    const today = format(new Date(), 'yyyy-MM-dd')
    const next = bookings.filter(booking => booking.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
    const operations = next ? await getBookingOperations(next.id) : null
    return { inquiries, bookings, blocks, ...attention, operations, asOf: Date.now() }
  } })
  if (isLoading) return <p className="p-6">Loading dashboard…</p>
  if (error || !data) return <p role="alert" className="p-6 text-red-700">Could not load the dashboard. Check the database connection and try again.</p>
  const now = data.asOf, today = format(new Date(now), 'yyyy-MM-dd')
  const activeBookingIds = new Set(data.bookings.map(booking => booking.id))
  const unanswered = data.inquiries.filter(i => ['new','inquiry'].includes(i.status || 'new') && !i.last_contacted_at)
  const tours = data.inquiries.filter(i => i.tour_at && new Date(i.tour_at).getTime() >= now && new Date(i.tour_at).getTime() <= now + 14 * DAY && i.status !== 'lost')
  const holds = data.blocks.filter(b => b.kind === 'hold' && b.expires_at && new Date(b.expires_at).getTime() <= now + 48 * 3600000)
  const overdue = data.payments.filter(p => activeBookingIds.has(p.booking_id) && p.due_on < today && p.paid_cents < p.amount_due_cents)
  const dueTasks = data.tasks.filter(t => activeBookingIds.has(t.booking_id) && t.due_at && new Date(t.due_at).getTime() < now)
  const nextWedding = data.bookings.filter(b => b.start_date >= today).sort((a,b) => a.start_date.localeCompare(b.start_date))[0]
  const nextWorkspace = data.workspaces.find(w => w.booking_id === nextWedding?.id)
  const nextTasks = data.tasks.filter(t => t.booking_id === nextWedding?.id)
  const missing = nextWedding ? [
    !nextWorkspace?.contract_signed_at && 'Signed contract not recorded',
    nextWedding.guest_camping_count > 0 && !nextWorkspace?.camping_notes && 'Camping arrival details missing',
    !nextWorkspace?.planning_notes && 'Planning decisions not recorded',
    !nextWorkspace?.setup_owner && 'Setup owner unassigned',
    !nextWorkspace?.readiness_owner && 'Readiness owner unassigned',
    !nextWorkspace?.checkout_owner && 'Checkout owner unassigned',
    !nextTasks.some(t => t.area === 'operations') && 'No operations tasks',
    !data.payments.some(p => p.booking_id === nextWedding.id) && 'Payment schedule not recorded',
    nextWedding.guest_camping_count > 0 && !data.operations?.camp.length && 'Nightly camping register empty',
    !data.operations?.contacts.length && 'Emergency contacts missing',
    !data.operations?.profile?.weather_plan && 'Weather contingency not recorded',
    data.operations && data.operations.checks.some(check => check.area !== 'checkout' && !check.completed_at) && 'Property readiness checks open',
  ].filter(Boolean) as string[] : []
  return <div className="space-y-5 p-6 text-slate-900"><div><h1 className="text-3xl font-bold">Needs attention</h1><p className="text-sm text-slate-600">Live work across leads, date holds, and confirmed weddings.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <section className={panel}><h2 className="text-lg font-semibold">Unanswered inquiries · {unanswered.length}</h2><ul className="mt-2 space-y-2 text-sm">{unanswered.slice(0,5).map(i => <li key={i.id}><Link className="text-blue-700 underline" to="/admin/inquiries">{i.full_name}</Link> · {i.wedding_date_estimate || 'Date undecided'}</li>)}</ul>{!unanswered.length && <p className="mt-2 text-sm text-slate-600">None right now.</p>}</section>
      <section className={panel}><h2 className="text-lg font-semibold">Tours in 14 days · {tours.length}</h2><ul className="mt-2 space-y-2 text-sm">{tours.map(i => <li key={i.id}><Link className="text-blue-700 underline" to="/admin/inquiries">{i.full_name}</Link> · {new Date(i.tour_at!).toLocaleString()}</li>)}</ul>{!tours.length && <p className="mt-2 text-sm text-slate-600">No tours scheduled.</p>}</section>
      <section className={panel}><h2 className="text-lg font-semibold">Holds expiring in 48 hours · {holds.length}</h2><ul className="mt-2 space-y-2 text-sm">{holds.map(h => <li key={h.id}><Link className="text-blue-700 underline" to="/admin/calendar">{h.label || `${h.start_date} – ${h.end_date}`}</Link> · {new Date(h.expires_at!).toLocaleString()}</li>)}</ul>{!holds.length && <p className="mt-2 text-sm text-slate-600">No holds expiring soon.</p>}</section>
      <section className={panel}><h2 className="text-lg font-semibold">Overdue payment items · {overdue.length}</h2><ul className="mt-2 space-y-2 text-sm">{overdue.map(p => <li key={p.id}><Link className="text-blue-700 underline" to={`/admin/bookings/${p.booking_id}`}>{p.label}</Link> · due {p.due_on}</li>)}</ul>{!overdue.length && <p className="mt-2 text-sm text-slate-600">No recorded items overdue.</p>}</section>
      <section className={panel}><h2 className="text-lg font-semibold">Overdue tasks · {dueTasks.length}</h2><ul className="mt-2 space-y-2 text-sm">{dueTasks.slice(0,5).map(t => <li key={t.id}><Link className="text-blue-700 underline" to={`/admin/bookings/${t.booking_id}`}>{t.title}</Link> · {t.assigned_to || 'Unassigned'}</li>)}</ul>{!dueTasks.length && <p className="mt-2 text-sm text-slate-600">No tasks overdue.</p>}</section>
      <section className={panel}><h2 className="text-lg font-semibold">Next wedding</h2>{nextWedding ? <><Link className="mt-2 block text-blue-700 underline" to={`/admin/bookings/${nextWedding.id}`}>{nextWedding.start_date} – {nextWedding.end_date}</Link><ul className="mt-2 list-inside list-disc text-sm">{missing.map(item => <li key={item}>{item}</li>)}</ul>{!missing.length && <p className="mt-2 text-sm text-slate-600">Core details recorded.</p>}</> : <p className="mt-2 text-sm text-slate-600">No future confirmed wedding.</p>}</section>
    </div>
  </div>
}
