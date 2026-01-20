import { useState } from 'react'
import CreateInquiryModal from '@/components/CreateInquiryModal'
import { useInquiries } from '@/hooks/useInquiries'

const statusClasses: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  viewing_scheduled: 'bg-yellow-100 text-yellow-800',
  viewed: 'bg-purple-100 text-purple-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
}

const InquiriesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { data: inquiries, isLoading, error } = useInquiries()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
        </div>
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-gray-900">
            Loading inquiries...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load inquiries.'
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
        </div>
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-red-700">{message}</p>
        </div>
      </div>
    )
  }

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
            <p className="mt-1 text-sm text-gray-600">No inquiries yet.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null)
              setIsModalOpen(true)
            }}
            className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            +New Inquiry
          </button>
        </div>
        {successMessage ? (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            {successMessage}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-lg">
          <p className="text-sm text-gray-900">No inquiries yet.</p>
        </div>
        <CreateInquiryModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(messageText) => setSuccessMessage(messageText)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
          <p className="mt-1 text-sm text-gray-600">
            Latest inquiries from your website.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage(null)
            setIsModalOpen(true)
          }}
          className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          +New Inquiry
        </button>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Wedding Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Source
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {inquiries.map((inquiry) => {
                const statusKey = inquiry.status ?? 'new'
                const badgeClass =
                  statusClasses[statusKey] ?? 'bg-gray-100 text-gray-800'

                return (
                  <tr key={inquiry.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inquiry.full_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {inquiry.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {inquiry.phone ?? '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inquiry.wedding_date_estimate ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inquiry.source ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {statusKey.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <CreateInquiryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(messageText) => setSuccessMessage(messageText)}
      />
    </div>
  )
}

export default InquiriesPage
