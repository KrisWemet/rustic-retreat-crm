import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { useInquiries } from '@/hooks/useInquiries'
import { useUpdateInquiry } from '@/hooks/useUpdateInquiry'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import CreateInquiryModal from '@/components/CreateInquiryModal'
import InquiryDetailModal from '@/components/InquiryDetailModal'
import ConvertToBookingModal from '@/components/ConvertToBookingModal'
import { useToast } from '@/components/ui/toast-context'

const stages = [
  { id: 'new', title: 'New Lead', matches: ['new', 'inquiry'] },
  { id: 'viewing_scheduled', title: 'First Contact', matches: ['viewing_scheduled'] },
  { id: 'approved', title: 'Qualified', matches: ['approved'] },
  { id: 'tour_scheduled', title: 'Tour Scheduled', matches: ['tour_scheduled'] },
  { id: 'viewed', title: 'Tour Completed', matches: ['viewed'] },
  { id: 'contract_sent', title: 'Contract Sent', matches: ['contract_sent'] },
  { id: 'contract_signed', title: 'Contract Signed', matches: ['contract_signed'] },
] as const
const bookedStatuses = new Set(['booked', 'booking_confirmed', 'pre_event_checklist', 'event_week', 'post_event_inspection'])
const isBooked = (inquiry: Inquiry) => bookedStatuses.has(inquiry.status ?? '')
const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
const due = (value: string | null) => value && new Date(value).getTime() <= Date.now()

type View = 'open' | 'follow_up' | 'lost' | 'booked' | 'all'

function LeadCard({ item, onOpen }: { item: Inquiry; onOpen: (item: Inquiry) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  return <div ref={setNodeRef} {...attributes} {...listeners}
    style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    className={`rounded-lg border border-border bg-surface p-3 shadow-sm ${isDragging ? 'z-50 opacity-60' : ''}`}>
    <button type="button" className="text-left font-semibold text-text hover:text-link" onClick={() => onOpen(item)}>{item.full_name}{item.partner_name ? ` & ${item.partner_name}` : ''}</button>
    <p className="mt-1 text-sm text-muted">{item.wedding_date_estimate || 'Date undecided'}</p>
    <p className="mt-2 text-xs text-muted">{daysSince(item.status_changed_at || item.created_at)} days in stage</p>
    {item.next_follow_up_at && <p className={`mt-1 text-xs ${due(item.next_follow_up_at) ? 'font-semibold text-red-700' : 'text-muted'}`}>Follow up {new Date(item.next_follow_up_at).toLocaleDateString()}</p>}
    <button type="button" className="mt-2 text-xs text-link underline" onClick={() => onOpen(item)}>View details</button>
  </div>
}

function StageColumn({ stage, items, onOpen }: { stage: typeof stages[number]; items: Inquiry[]; onOpen: (item: Inquiry) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return <section ref={setNodeRef} className={`w-64 shrink-0 rounded-lg bg-surface-2 p-3 ${isOver ? 'ring-2 ring-accent' : ''}`}>
    <h2 className="mb-3 flex justify-between text-sm font-bold text-text"><span>{stage.title}</span><span>{items.length}</span></h2>
    <div className="space-y-3">{items.map(item => <LeadCard key={item.id} item={item} onOpen={onOpen} />)}</div>
  </section>
}

export default function InquiryBoard() {
  const { data: inquiries = [], isLoading, error } = useInquiries()
  const update = useUpdateInquiry()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('open')
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const open = (item: Inquiry) => { setSelected(item); setDetailOpen(true) }
  const counts = useMemo(() => ({
    open: inquiries.filter(i => i.status !== 'lost' && !isBooked(i)).length,
    follow_up: inquiries.filter(i => i.status !== 'lost' && !isBooked(i) && due(i.next_follow_up_at)).length,
    lost: inquiries.filter(i => i.status === 'lost').length,
    booked: inquiries.filter(isBooked).length,
    all: inquiries.length,
  }), [inquiries])
  const filtered = useMemo(() => inquiries.filter(i => {
    const matchesView = view === 'all' || (view === 'open' && i.status !== 'lost' && !isBooked(i)) ||
      (view === 'follow_up' && i.status !== 'lost' && !isBooked(i) && due(i.next_follow_up_at)) ||
      (view === 'lost' && i.status === 'lost') || (view === 'booked' && isBooked(i))
    const text = [i.full_name, i.partner_name, i.email, i.phone, i.wedding_date_estimate].join(' ').toLowerCase()
    return matchesView && text.includes(search.trim().toLowerCase())
  }), [inquiries, search, view])
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const stage = stages.find(s => s.id === over?.id)
    const item = inquiries.find(i => i.id === active.id)
    if (!stage || !item || stage.matches.includes((item.status || 'new') as never)) return
    try { await update.mutateAsync({ id: item.id, data: { status: stage.id } }); show(`Moved to ${stage.title}`) }
    catch { show('Could not move lead') }
  }
  return <div className="min-h-screen bg-bg p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-page-title text-text">Leads</h1><p className="text-sm text-muted">Track inquiries through contract signing. Confirmed weddings live in Bookings.</p></div><button type="button" className="rounded-md bg-accent px-4 py-2 font-semibold text-white" onClick={() => setCreateOpen(true)}>+ Add Lead</button></div>
    {error && <p role="alert" className="mb-4 text-red-700">Could not load inquiries: {error.message}</p>}
    <div className="mb-5 flex flex-wrap gap-2">{(['open','follow_up','lost','booked','all'] as const).map(id => <button key={id} type="button" onClick={() => setView(id)} className={`rounded-md border px-3 py-2 text-sm ${view === id ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-text'}`}>{({open:'Open',follow_up:'Follow-up due',lost:'Lost',booked:'Booked',all:'All'} as const)[id]} <strong>{counts[id]}</strong></button>)}</div>
    <label className="mb-5 block max-w-sm text-sm text-text">Search leads<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone, or wedding date" className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2" /></label>
    {isLoading ? <p>Loading leads…</p> : view === 'open' || view === 'follow_up' ? <DndContext sensors={sensors} onDragEnd={handleDragEnd}><div className="flex gap-4 overflow-x-auto pb-4">{stages.map(stage => <StageColumn key={stage.id} stage={stage} items={filtered.filter(i => stage.matches.includes((i.status || 'new') as never))} onOpen={open} />)}</div></DndContext> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(item => <LeadCard key={item.id} item={item} onOpen={open} />)}</div>}
    {!isLoading && filtered.length === 0 && <p className="mt-4 text-sm text-muted">No leads in this view.</p>}
    <CreateInquiryModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={show} />
    <InquiryDetailModal inquiry={selected} open={detailOpen} onClose={() => {setDetailOpen(false); setSelected(null)}} onConvertToBooking={item => {setSelected(item); setDetailOpen(false); setConvertOpen(true)}} />
    <ConvertToBookingModal inquiry={selected} open={convertOpen} onClose={() => setConvertOpen(false)} />
  </div>
}
