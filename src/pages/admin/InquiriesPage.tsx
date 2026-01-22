import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import CreateInquiryModal from '@/components/CreateInquiryModal'
import InquiryDetailModal from '@/components/InquiryDetailModal'
import ConvertToBookingModal from '@/components/ConvertToBookingModal'
import { useInquiries } from '@/hooks/useInquiries'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import { useDeleteInquiry } from '@/hooks/useDeleteInquiry'
import { Button } from '@/components/ui/button'
import DataTable, { type RowType } from '@/components/inquiries/DataTable'

const InquiriesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isConvertOpen, setIsConvertOpen] = useState(false)
  const { data: inquiries, isLoading, error } = useInquiries()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const deleteMutation = useDeleteInquiry()

  const statusTabs = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'viewing_scheduled', label: 'Viewing Scheduled' },
    { id: 'booked', label: 'Booked' },
    { id: 'lost', label: 'Lost' },
  ]

  const filteredInquiries = useMemo(() => {
    const list = inquiries ?? []
    return list.filter((inq) => {
      const matchesStatus =
        filterStatus === 'all' || (inq.status ?? 'new') === filterStatus
      const needle = search.trim().toLowerCase()
      const matchesSearch = !needle
        ? true
        : [inq.full_name, inq.email, inq.phone]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle))
      return matchesStatus && matchesSearch
    })
  }, [inquiries, filterStatus, search])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream p-8">
        <div className="mb-6">
          <h1 className="heading-serif text-3xl font-bold">Inquiries</h1>
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--brand-accent)] bg-white p-6 shadow-soft">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-[var(--brand-cream)]" />
            <div className="h-10 w-full rounded bg-[var(--brand-cream)]" />
            <div className="h-10 w-full rounded bg-[var(--brand-cream)]" />
            <div className="h-10 w-full rounded bg-[var(--brand-cream)]" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load inquiries.'
    return (
      <div className="min-h-screen bg-brand-cream p-8">
        <div className="mb-6">
          <h1 className="heading-serif text-3xl font-bold">Inquiries</h1>
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--brand-accent)] bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-red-700">{message}</p>
        </div>
      </div>
    )
  }

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="min-h-screen bg-brand-cream p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="heading-serif text-3xl font-bold">Inquiries</h1>
            <p className="mt-1 text-sm text-[var(--brand-text)]/70">No inquiries yet.</p>
          </div>
          <Button
            onClick={() => {
              setSuccessMessage(null)
              setIsModalOpen(true)
            }}
            variant="primary"
          >
            + New Inquiry
          </Button>
        </div>
        {successMessage ? (
          <div className="mb-4 rounded-lg border border-[var(--brand-accent)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-text)]">
            {successMessage}
          </div>
        ) : null}
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-[var(--brand-accent)] bg-white p-8 text-center shadow-soft">
          <img
            src="/Images/wjpffhMTBZVV.png"
            alt="Empty state"
            className="mx-auto mb-6 h-40 w-auto opacity-80"
          />
          <h2 className="heading-serif text-2xl font-semibold">No Inquiries Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--brand-text)]/70">
            Start your pipeline by creating your first inquiry. You can import leads later or capture them from your website.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="inline-flex"
            >
              + New Inquiry
            </Button>
          </div>
        </div>
        <CreateInquiryModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(messageText) => setSuccessMessage(messageText)}
        />
        <InquiryDetailModal
          inquiry={selectedInquiry}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedInquiry(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="heading-serif text-3xl font-bold text-[var(--brand-charcoal)]">Inquiries</h1>
          <p className="mt-2 text-[var(--brand-charcoal)]/60">
            Manage and track your leads.
          </p>
        </div>
        <Button
          onClick={() => {
            setSuccessMessage(null)
            setIsModalOpen(true)
          }}
          variant="primary"
          className="shadow-md"
        >
          + New Inquiry
        </Button>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm border border-green-100">
          {successMessage}
        </div>
      )}

      <div className="mb-6 space-y-4">
        {/* Search and Tabs Container */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white/50 rounded-full border border-[var(--brand-accent)]/30 backdrop-blur-sm">
            {statusTabs.map((tab) => {
              const isActive = filterStatus === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[var(--brand-terracotta)] shadow-sm ring-1 ring-[var(--brand-accent)]/50'
                      : 'text-[var(--brand-charcoal)]/60 hover:text-[var(--brand-charcoal)] hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[var(--brand-charcoal)]/40" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inquiries..."
              className="block w-full rounded-full border border-[var(--brand-accent)] bg-white py-2 pl-10 pr-4 text-sm text-[var(--brand-charcoal)] placeholder:text-[var(--brand-charcoal)]/40 focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-terracotta)]/20 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      <DataTable
        data={filteredInquiries as unknown as RowType[]}
        onView={(row) => {
          const found = inquiries?.find((i) => i.id === row.id) || null
          setSelectedInquiry(found)
          setIsDetailOpen(true)
        }}
        onEdit={(row) => {
          const found = inquiries?.find((i) => i.id === row.id) || null
          setSelectedInquiry(found)
          setIsDetailOpen(true)
        }}
        onDelete={async (row) => {
          const confirmed = window.confirm('Delete this inquiry?')
          if (!confirmed) return
          try {
            await deleteMutation.mutateAsync(row.id)
            setSuccessMessage('Inquiry deleted')
          } catch (e) {
            setSuccessMessage('Failed to delete inquiry')
          }
        }}
      />
      <CreateInquiryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(messageText) => setSuccessMessage(messageText)}
      />
      <InquiryDetailModal
        inquiry={selectedInquiry}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedInquiry(null)
        }}
        onConvertToBooking={() => {
          setIsDetailOpen(false)
          setIsConvertOpen(true)
        }}
      />
      <ConvertToBookingModal inquiry={selectedInquiry} open={isConvertOpen} onClose={() => setIsConvertOpen(false)} />
    </div>
  )
}

export default InquiriesPage