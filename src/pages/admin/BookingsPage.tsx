import { useQuery } from '@tanstack/react-query'
import { useInquiries } from '@/hooks/useInquiries'
import { getBookings } from '@/lib/supabase/queries/bookings'
import { Link } from 'react-router-dom'

export default function BookingsPage() {
  const { data: bookings = [], isLoading, error } = useQuery({ queryKey: ['bookings'], queryFn: getBookings })
  const { data: inquiries = [] } = useInquiries()
  const inquiryNames = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry.full_name]))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Confirmed Bookings</h1>
      <p className="mt-1 text-sm text-slate-600">Each wedding reserves its dates and the following reset day.</p>
      {isLoading ? <p className="mt-6">Loading bookings…</p> : null}
      {error ? <p className="mt-6 text-red-700">Could not load bookings. Please refresh.</p> : null}
      {!isLoading && !error && bookings.length === 0 ? <p className="mt-6 rounded-xl bg-white p-6 text-slate-600">No confirmed bookings yet.</p> : null}
      {!isLoading && !error && bookings.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Couple</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Package</th>
                <th className="p-3">Guests</th>
                <th className="p-3">RVs</th>
                <th className="p-3">Base price</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b last:border-0">
                  <td className="p-3 font-medium"><Link className="text-blue-700 underline" to={`/admin/bookings/${booking.id}`}>{booking.inquiry_id ? inquiryNames.get(booking.inquiry_id) || 'Inquiry unavailable' : 'Open wedding workspace'}</Link></td>
                  <td className="p-3">{booking.start_date} – {booking.end_date}</td>
                  <td className="p-3">{booking.package_terms?.name || booking.package.replaceAll('_', ' ')}</td>
                  <td className="p-3">{booking.guest_reception_count} reception · {booking.guest_camping_count} camping</td>
                  <td className="p-3">{booking.rv_count ?? 'Unknown'}</td>
                  <td className="p-3">{booking.package_terms ? `$${(booking.package_terms.basePriceCents / 100).toLocaleString('en-CA')} CAD + GST` : 'Check original contract'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
