import * as React from 'react'
import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import { Table, TBody, THead, TH, TR, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MoreVertical } from 'lucide-react'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown'

export type RowType = {
  id: string
  full_name: string
  email: string
  phone: string | null
  wedding_date_estimate: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type Props = {
  data: RowType[]
  onView: (row: RowType) => void
  onEdit: (row: RowType) => void
  onDelete: (row: RowType) => void
}

function StatusBadge({ status }: { status: string | null }) {
  const key = (status ?? 'new').toLowerCase()
  const color =
    key === 'booked'
      ? 'green'
      : key === 'viewing_scheduled'
      ? 'amber'
      : key === 'viewed'
      ? 'purple'
      : key === 'new'
      ? 'blue'
      : 'gray'
  return <Badge color={color as any}>{key.replace('_', ' ')}</Badge>
}

export default function DataTable({ data, onView, onEdit, onDelete }: Props) {
  const columns = useMemo<ColumnDef<RowType>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => {
          const name = row.original.full_name
          const initials = name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()

          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-terracotta)]/10 text-xs font-bold text-[var(--brand-terracotta)] ring-1 ring-[var(--brand-terracotta)]/20">
                {initials}
              </div>
              <span className="font-semibold text-[var(--brand-charcoal)]">
                {name}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'contact',
        header: 'Contact',
        cell: ({ row }) => (
          <div>
            <div className="text-[var(--brand-text)]/80">Email: {row.original.email}</div>
            <div className="text-[var(--brand-text)]/60">
              Phone: {row.original.phone ?? '—'}
            </div>
          </div>
        ),
      },
      { accessorKey: 'wedding_date_estimate', header: 'Wedding Date' },
      { accessorKey: 'source', header: 'Source' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const [open, setOpen] = React.useState(false)
          return (
            <div className="relative text-right" onClick={(e) => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger onToggle={() => setOpen((v) => !v)}>
                  <MoreVertical className="h-4 w-4" />
                </DropdownTrigger>
                <DropdownContent open={open} onClose={() => setOpen(false)}>
                  <DropdownItem onClick={() => onView(row.original)}>View Details</DropdownItem>
                  <DropdownItem onClick={() => onEdit(row.original)}>Edit</DropdownItem>
                  <DropdownItem tone="danger" onClick={() => onDelete(row.original)}>
                    Delete
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--brand-charcoal)]/80">
            {new Date(row.original.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ),
      },
    ],
    [],
  )

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pageSize, setPageSize] = React.useState<number>(10)
  const [columnsOpen, setColumnsOpen] = React.useState(false)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  React.useEffect(() => {
    table.setPageSize(pageSize)
  }, [pageSize, table])

  return (
    <div className="rounded-2xl border border-[var(--brand-accent)]/60 bg-white shadow-soft">
      {/* Table toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm text-[var(--brand-text)]/70">{data.length} results</div>
        <div className="relative">
          <button
            className="rounded-full border border-[var(--brand-accent)] bg-white px-3 py-1.5 text-sm text-[var(--brand-text)] hover:bg-[var(--brand-cream)]"
            onClick={() => setColumnsOpen((v) => !v)}
          >
            Columns
          </button>
          {columnsOpen ? (
            <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-[var(--brand-accent)] bg-white p-2 shadow-soft">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-sm text-[var(--brand-text)]">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={(e) => col.toggleVisibility(e.target.checked)}
                  />
                  {col.columnDef.header as React.ReactNode}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <THead>
            {table.getHeaderGroups().map((hg) => (
              <TR key={hg.id}>
                {hg.headers.map((header) => (
                  <TH key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-1 hover:text-[var(--brand-text)]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <span>▲</span>}
                        {header.column.getIsSorted() === 'desc' && <span>▼</span>}
                      </button>
                    )}
                  </TH>
                ))}
              </TR>
            ))}
          </THead>
          <TBody>
            {table.getRowModel().rows.map((row) => (
              <TR key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TD key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--brand-text)]/70">Rows per page</span>
          <select
            className="rounded-lg border border-[var(--brand-accent)] bg-white px-2 py-1 text-[var(--brand-text)]"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-[var(--brand-accent)] px-3 py-1.5 text-[var(--brand-text)] hover:bg-[var(--brand-cream)] disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>
          <span className="text-[var(--brand-text)]/70">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <button
            className="rounded-full border border-[var(--brand-accent)] px-3 py-1.5 text-[var(--brand-text)] hover:bg-[var(--brand-cream)] disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
