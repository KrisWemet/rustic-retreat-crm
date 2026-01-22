import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { useInquiries } from '@/hooks/useInquiries'
import { useUpdateInquiry } from '@/hooks/useUpdateInquiry'
import { useQueryClient } from '@tanstack/react-query'
import type { Inquiry } from '@/lib/supabase/queries/inquiries'
import {
  Calendar as CalendarIcon,
  MoreVertical,
  Trash2,
  CheckCircle2,
  FolderOpen,
  Lock,
  Search,
  Settings,
  ChevronDown,
  Star,
  Filter as FilterIcon,
  FileText,
  List,
  Grid,
  HelpCircle,
  Inbox,
  Box,
  CalendarCheck
} from 'lucide-react'
import { useDeleteInquiry } from '@/hooks/useDeleteInquiry'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown'
import { useToast } from '@/components/ui/toast'
import InquiryDetailModal from '@/components/InquiryDetailModal'
import ConvertToBookingModal from '@/components/ConvertToBookingModal'
import { differenceInDays } from 'date-fns'

// --- Constants ---
const COLUMNS = [
  { id: 'new', title: 'New Lead', icon: FilterIcon, match: (s: string | null) => ['new', 'inquiry'].includes((s ?? 'new').toLowerCase()) },
  { id: 'viewing_scheduled', title: 'First Contact', icon: CalendarIcon, match: (s: string | null) => (s ?? '').toLowerCase() === 'viewing_scheduled' },
  { id: 'approved', title: 'Lead Qualified', icon: CheckCircle2, match: (s: string | null) => (s ?? '').toLowerCase() === 'approved' },
  { id: 'tour_scheduled', title: 'Appointment/Call Scheduled', icon: CalendarIcon, match: (s: string | null) => (s ?? '').toLowerCase() === 'tour_scheduled' },
  { id: 'contract_sent', title: 'Contract Sent', icon: FileText, match: (s: string | null) => (s ?? '').toLowerCase() === 'contract_sent' },
]

// --- Sub-components ---

function StatCard({
  icon: Icon,
  count,
  label,
  sublabel,
  iconClass,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  sublabel: string;
  iconClass: string; 
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-surface p-4 shadow-1 border border-border">
      <div className={`grid h-[34px] w-[34px] place-items-center rounded-full ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[14px] font-semibold tracking-wide text-text">{label}</div>
        <div className="mt-0.5 text-[18px] font-bold text-text">{count}</div>
        <div className="mt-0.5 text-[12px] text-muted">{sublabel}</div>
      </div>
    </div>
  )
}

function LeadCard({ item, onView, onDelete, onConvert }: { item: Inquiry; onView: (i: Inquiry) => void; onDelete: (i: Inquiry) => void; onConvert: (i: Inquiry) => void }) {
  const status = (item.status ?? 'new').toLowerCase()
  const createdDate = new Date(item.created_at)
  const daysOld = differenceInDays(new Date(), createdDate)
  
  const statusColors: Record<string, string> = {
    booked: 'bg-green-500',
    tour_scheduled: 'bg-yellow-500',
    viewed: 'bg-purple-500',
    new: 'bg-blue-500',
    lost: 'bg-red-500'
  }
  const dotColor = statusColors[status] || 'bg-gray-400'

  return (
    <div className="mb-3 rounded-md bg-surface p-3.5 shadow-1 border border-border group relative transition-all hover:shadow-2">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <h3 
          className="cursor-pointer text-[14px] font-bold text-text hover:text-link"
          onClick={() => onView(item)}
        >
          {item.full_name}
        </h3>
        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </div>

      <div className="text-[13px] text-text">
        {item.wedding_date_estimate ? new Date(item.wedding_date_estimate).toLocaleDateString() : 'Date TBA'}
      </div>

      {/* Meta Indicators */}
      <div className="mt-2 flex gap-2.5 text-[12px] text-muted">
         <span>{daysOld} days old</span>
         <span>0 days in step</span>
      </div>

      {/* Contacts */}
      <div className="mt-2.5 flex items-center gap-2 text-[12px] text-muted">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
          {item.full_name.charAt(0)}
        </div>
        <span className="truncate">{item.full_name}</span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => onView(item)} className="text-[12px] text-link hover:underline">
          View Pipeline History
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"><Star className="h-3.5 w-3.5" /></button>
           <button className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"><FilterIcon className="h-3.5 w-3.5" /></button>
           <CardMenu onView={() => onView(item)} onConvert={() => onConvert(item)} onDelete={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}

function DraggableCard(props: React.ComponentProps<typeof LeadCard>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.item.id })
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <div ref={setNodeRef} style={style} className={`touch-none ${isDragging ? 'opacity-50 z-50' : ''}`} {...listeners} {...attributes}>
      <LeadCard {...props} />
    </div>
  )
}

function CardMenu({ onView, onConvert, onDelete }: { onView: () => void; onConvert: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Dropdown>
        <DropdownTrigger onToggle={() => setOpen((v) => !v)}>
           <div className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text cursor-pointer">
              <MoreVertical className="h-3.5 w-3.5" />
           </div>
        </DropdownTrigger>
        <DropdownContent open={open} onClose={() => setOpen(false)}>
          <DropdownItem onClick={onView}>View Details</DropdownItem>
          <DropdownItem onClick={onConvert}>Convert to Booking</DropdownItem>
          <DropdownItem tone="danger" onClick={onDelete}>Delete</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  )
}

// --- Main Component ---

export default function InquiryBoard() {
  const { data: inquiries = [] } = useInquiries()
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isConvertOpen, setIsConvertOpen] = useState(false)
  const queryClient = useQueryClient()
  const updateMutation = useUpdateInquiry()
  const deleteMutation = useDeleteInquiry()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))
  const { show } = useToast()

  const counts = useMemo(() => {
    const by = (p: (i: Inquiry) => boolean) => inquiries.filter(p).length
    return {
      captured: by((i) => ['new', 'inquiry'].includes((i.status ?? 'new').toLowerCase())),
      lost: by((i) => (i.status ?? '').toLowerCase() === 'lost'),
      won: by((i) => (i.status ?? '').toLowerCase() === 'booking_confirmed'),
      open: by((i) => !['lost', 'booking_confirmed', 'new', 'inquiry'].includes((i.status ?? '').toLowerCase())),
      holds: by((i) => (i.status ?? '').toLowerCase() === 'hold'),
    }
  }, [inquiries])

  const groups = useMemo(() => {
    return COLUMNS.map((col) => ({ 
      id: col.id, 
      title: col.title, 
      icon: col.icon, 
      items: inquiries.filter((i) => col.match(i.status ?? null)) 
    }))
  }, [inquiries])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const itemId = String(active.id)
    const overId = String(over.id)
    const targetColumn = COLUMNS.find((c) => c.id === overId)
    if (!targetColumn) return
    const item = inquiries.find((i) => i.id === itemId)
    if (!item) return
    const nextStatus = targetColumn.id
    
    // Optimistic Update
    const prev = queryClient.getQueryData<Inquiry[]>(['inquiries'])
    queryClient.setQueryData<Inquiry[]>(['inquiries'], (old) =>
      (old ?? []).map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i)),
    )
    try {
      await updateMutation.mutateAsync({ id: itemId, data: { status: nextStatus as any } })
      show(`Moved to ${targetColumn.title}`)
    } catch (e) {
      queryClient.setQueryData(['inquiries'], prev)
      show('Failed to move lead')
    }
  }

  return (
    <div className="leads-page flex h-screen flex-col bg-bg">
      {/* 1. Header Region */}
      <div className="flex-none px-8 pt-6 pb-2">
         {/* Breadcrumbs */}
         <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-muted">
            <span className="hover:text-link cursor-pointer">Home</span>
            <span className="text-gray-300">/</span>
            <span className="text-text">Leads</span>
         </div>

         {/* Title & Actions */}
         <div className="mb-6 flex items-start justify-between">
            <h1 className="text-page-title text-text">Leads</h1>
            <div className="flex gap-3">
               <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-2 transition-colors">
                 + Add Lead
               </button>
               <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-2 transition-colors">
                 Setup <Settings className="h-4 w-4 text-muted" />
               </button>
            </div>
         </div>

         {/* Search Row */}
         <div className="flex justify-end mb-4">
            <div className="flex items-center gap-3">
               <div className="relative w-72">
                  <input 
                    type="text" 
                    placeholder="Begin typing to filter current view..." 
                    className="w-full rounded-md border border-border bg-surface py-2 pl-3 pr-8 text-sm placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-2" />
               </div>
               <button className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2">
                  Advanced Search <ChevronDown className="h-3 w-3" />
               </button>
            </div>
         </div>

         {/* 2. Stat Cards Row */}
         <div className="grid grid-cols-5 gap-4 mb-4">
            <StatCard icon={Inbox} count={counts.captured} label="Captured" sublabel="past 60 days" iconClass="bg-[#fef9c3] text-yellow-700" />
            <StatCard icon={Box} count={counts.lost} label="Lost" sublabel="past 3 days" iconClass="bg-[#fee2e2] text-red-700" />
            <StatCard icon={CalendarCheck} count={counts.won} label="Won" sublabel="past 60 days" iconClass="bg-[#ede9fe] text-purple-700" />
            <StatCard icon={FolderOpen} count={counts.open} label="Open" sublabel="View" iconClass="bg-[#dcfce7] text-green-700" />
            <StatCard icon={Lock} count={counts.holds} label="Holds" sublabel="View" iconClass="bg-[#ffedd5] text-orange-700" />
         </div>
      </div>

      {/* 3. Main Content Split */}
      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-6">
         {/* Left Panel: Quick Views */}
         <div className="w-[240px] flex-none rounded-md border border-border bg-surface shadow-1 flex flex-col overflow-hidden h-fit">
            <div className="px-3.5 py-3 text-[14px] font-bold tracking-wide text-text border-b border-surface-2">
               Quick Views
            </div>
            
            <nav className="flex-1 py-1">
               {[
                 { id: 'all', label: 'All' },
                 { id: 'open_holds', label: 'Open + Holds', active: true },
                 { id: 'open', label: 'Open' },
                 { id: 'holds', label: 'Holds' },
                 { id: 'lost', label: 'Lost (Closed)' },
                 { id: 'captured', label: 'Captured' },
               ].map((view) => (
                 <div key={view.id} className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-[14px] ${view.active ? 'bg-[#eef2ff] border-l-4 border-link pl-2.5 font-medium text-link' : 'text-text hover:bg-bg border-l-4 border-transparent'}`}>
                    {view.active && <div className="hidden" />}
                    <span>{view.label}</span>
                 </div>
               ))}
            </nav>

            <div className="border-t border-surface-2 p-1">
               <button className="flex w-full items-center gap-3 px-3.5 py-2.5 text-[14px] text-muted hover:bg-bg hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                  <span>Trash</span>
               </button>
            </div>
         </div>

         {/* Right Panel: Kanban Board */}
         <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5 shadow-1">
               <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">FILTERING BY:</span>
                  <div className="flex gap-2">
                     <span className="rounded-full bg-surface-2 border border-border px-2.5 py-1 text-[12px] text-text">Open + Holds</span>
                     <span className="rounded-full bg-surface-2 border border-border px-2.5 py-1 text-[12px] text-text">All Event Dates</span>
                     <span className="rounded-full bg-surface-2 border border-border px-2.5 py-1 text-[12px] text-text">All Captured</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-bg"><FilterIcon className="h-4 w-4 text-muted" /></button>
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-bg"><Grid className="h-4 w-4 text-muted" /></button>
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-bg"><List className="h-4 w-4 text-muted" /></button>
               </div>
            </div>

            {/* Columns */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="grid flex-1 grid-cols-4 gap-4 overflow-x-auto pb-4">
                {groups.slice(0, 4).map((col) => {
                  const { setNodeRef, isOver } = useDroppable({ id: col.id })
                  return (
                    <div
                      key={col.id}
                      ref={setNodeRef}
                      className={`flex min-w-[260px] flex-col rounded-md bg-surface-2 p-3 transition-colors ${isOver ? 'ring-2 ring-accent/20' : ''}`}
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <h3 className="text-[14px] font-bold text-text">{col.title}</h3>
                         </div>
                         <span className="text-[12px] font-medium text-muted">{col.items.length}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-1">
                        {col.items.map((item) => (
                          <DraggableCard
                            key={item.id}
                            item={item}
                            onView={(i) => {
                              setSelectedInquiry(i)
                              setIsDetailOpen(true)
                            }}
                            onDelete={async (i) => {
                              const confirmed = window.confirm('Delete this inquiry?')
                              if (!confirmed) return
                              try {
                                await deleteMutation.mutateAsync(i.id)
                                show('Inquiry deleted')
                              } catch (e) {
                                show('Failed to delete inquiry')
                              }
                            }}
                            onConvert={(i) => {
                              setSelectedInquiry(i)
                              setIsConvertOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </DndContext>
         </div>
      </div>
      
      {/* Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
         <button className="grid h-12 w-12 place-items-center rounded-full bg-text text-white shadow-lg hover:bg-text/90 hover:scale-105 transition-all">
            <HelpCircle className="h-6 w-6" />
         </button>
      </div>

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