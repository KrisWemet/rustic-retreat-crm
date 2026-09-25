import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { financialPosition } from '@/lib/financial'
import { getFinancialOverview } from '@/lib/supabase/queries/finance'

const money = (cents: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)

export default function PaymentsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['financial-overview'], queryFn: getFinancialOverview })
  if (isLoading) return <p className="p-6">Loading financial overview…</p>
  if (error || !data) return <p role="alert" className="p-6">Could not load financial records.</p>
  return <div className="space-y-4 p-6 text-slate-900"><div><h1 className="text-3xl font-bold">Payments</h1><p className="text-sm text-slate-600">Contract totals, approved extras, receipts, and outstanding balances. Damage deposits remain separate.</p></div><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Wedding</th><th className="p-3">Contract</th><th className="p-3">Approved extras</th><th className="p-3">Received</th><th className="p-3">Outstanding</th><th className="p-3">Schedule</th></tr></thead><tbody>{data.bookings.map(booking => {
    const agreement = data.agreements.find(item => item.booking_id === booking.id)
    const position = financialPosition(agreement?.contract_total_cents ?? null, data.charges.filter(item => item.booking_id === booking.id), data.receipts.filter(item => item.booking_id === booking.id))
    const schedule = data.payments.filter(item => item.booking_id === booking.id).reduce((sum, item) => sum + item.amount_due_cents, 0)
    const inquiry = data.inquiries.find(item => item.id === booking.inquiry_id)
    return <tr key={booking.id} className="border-b"><td className="p-3"><Link to={`/admin/bookings/${booking.id}`} className="text-blue-700 underline">{inquiry?.full_name || 'Wedding'} · {booking.start_date}</Link></td><td className="p-3">{agreement ? money(agreement.contract_total_cents) : 'Not recorded'}</td><td className="p-3">{money(position.addedChargesCents)}</td><td className="p-3">{money(position.receivedCents)}</td><td className="p-3">{position.outstandingCents === null ? 'Unknown' : money(position.outstandingCents)}</td><td className="p-3">{money(schedule)}</td></tr>
  })}</tbody></table>{!data.bookings.length && <p className="p-4 text-sm">No confirmed weddings yet.</p>}</div></div>
}
