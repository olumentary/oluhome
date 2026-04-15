'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ItemCard } from '@/components/items/item-card';
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from 'lucide-react';
import { getItems, type ItemsResult } from '@/app/(dashboard)/items/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemRow {
  id: string;
  title: string;
  period: string | null;
  style: string | null;
  room: string | null;
  condition: string | null;
  status: string;
  createdAt: Date;
  typeName: string;
  typeId: string;
  primaryPhotoKey: string | null;
  thumbnailKey: string | null;
  latestValue: string | null;
}

interface ItemsListClientProps {
  initialData: ItemsResult;
  itemTypes: Array<{ id: string; name: string }>;
  rooms: string[];
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  sold: 'Sold',
  gifted: 'Gifted',
  stored: 'Stored',
  on_loan: 'On Loan',
};

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<ItemRow>[] = [
  {
    accessorKey: 'thumbnail',
    header: '',
    size: 56,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex size-10 items-center justify-center rounded bg-muted">
        {row.original.thumbnailKey ? (
          <ImageOff className="size-4 text-muted-foreground/40" />
        ) : (
          <ImageOff className="size-4 text-muted-foreground/40" />
        )}
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Title
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/items/${row.original.id}`}
        className="font-medium hover:text-primary hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'typeName',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs font-normal">
        {row.original.typeName}
      </Badge>
    ),
  },
  {
    accessorKey: 'period',
    header: 'Period',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.period ?? '--'}
      </span>
    ),
  },
  {
    accessorKey: 'room',
    header: 'Room',
    cell: ({ row }) =>
      row.original.room ? (
        <Badge variant="secondary" className="text-xs font-normal">
          {row.original.room}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">--</span>
      ),
  },
  {
    accessorKey: 'condition',
    header: 'Condition',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.condition
          ? (CONDITION_LABELS[row.original.condition] ?? row.original.condition)
          : '--'}
      </span>
    ),
  },
  {
    accessorKey: 'latestValue',
    header: 'Est. Value',
    cell: ({ row }) =>
      row.original.latestValue ? (
        <span className="text-sm font-medium">
          ${parseFloat(row.original.latestValue).toLocaleString()}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">--</span>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Added
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItemsListClient({
  initialData,
  itemTypes,
  rooms,
}: ItemsListClientProps) {
  const [data, setData] = useState<ItemsResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // View toggle
  const [view, setView] = useState<'table' | 'grid'>('table');

  // Table sorting
  const [sorting, setSorting] = useState<SortingState>([]);

  // Pagination cursors
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const fetchItems = useCallback(
    (cursor?: string, resetCursors = false) => {
      startTransition(async () => {
        const result = await getItems({
          search: search || undefined,
          typeId: typeId || undefined,
          room: roomFilter || undefined,
          conditions: conditionFilter ? [conditionFilter] : undefined,
          status: statusFilter || undefined,
          cursor,
          limit: 24,
        });
        setData(result);
        if (resetCursors) {
          setCursorStack([]);
        }
      });
    },
    [search, typeId, roomFilter, conditionFilter, statusFilter],
  );

  // Apply filters (resets to first page)
  const applyFilters = useCallback(() => {
    fetchItems(undefined, true);
  }, [fetchItems]);

  // Pagination handlers
  function handleNextPage() {
    if (data.nextCursor) {
      setCursorStack((prev) => [...prev, data.nextCursor!]);
      fetchItems(data.nextCursor);
    }
  }

  function handlePrevPage() {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      newStack.pop();
      setCursorStack(newStack);
      fetchItems(newStack[newStack.length - 1]);
    }
  }

  const table = useReactTable({
    data: data.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const pageNumber = cursorStack.length + 1;
  const totalPages = Math.ceil(data.totalCount / 24);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Collection</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.totalCount} item{data.totalCount !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Button asChild>
          <Link href="/items/new">
            <Plus className="size-4" />
            Add Item
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
        </div>

        <Select value={typeId} onValueChange={(v) => { setTypeId(v === 'all' ? '' : v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {itemTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roomFilter} onValueChange={(v) => { setRoomFilter(v === 'all' ? '' : v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={conditionFilter} onValueChange={(v) => { setConditionFilter(v === 'all' ? '' : v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {Object.entries(CONDITION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={applyFilters} disabled={isPending}>
          {isPending ? 'Loading...' : 'Apply'}
        </Button>

        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('table')}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <ImageOff className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {data.totalCount === 0
              ? 'No items in your collection yet.'
              : 'No items match the current filters.'}
          </p>
          {data.totalCount === 0 && (
            <Button size="sm" className="mt-4" asChild>
              <Link href="/items/new">
                <Plus className="size-4" />
                Add your first item
              </Link>
            </Button>
          )}
        </div>
      ) : view === 'table' ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <ItemCard
              key={item.id}
              id={item.id}
              title={item.title}
              typeName={item.typeName}
              period={item.period}
              room={item.room}
              condition={item.condition}
              latestValue={item.latestValue}
              thumbnailKey={item.thumbnailKey}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.totalCount > 24 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pageNumber} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorStack.length === 0 || isPending}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data.nextCursor || isPending}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
