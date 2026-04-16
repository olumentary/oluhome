'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Shapes,
  Store,
  Home,
  TrendingUp,
  Settings,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { searchItems } from '@/app/(dashboard)/actions';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    {
      id: string;
      title: string;
      room: string | null;
      period: string | null;
      typeName?: string;
      snippet?: string;
    }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Search items as user types (debounced 300ms)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const items = await searchItems(query);
        setResults(items);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery('');
      router.push(href);
    },
    [router, onOpenChange],
  );

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) setQuery('');
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command Palette"
      description="Search your collection or navigate quickly"
    >
      <CommandInput
        placeholder="Type a command or search items..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isPending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </span>
          ) : (
            'No results found.'
          )}
        </CommandEmpty>

        {/* Search results */}
        {results.length > 0 && (
          <CommandGroup heading="Items">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => navigate(`/items/${item.id}`)}
                className="flex flex-col items-start gap-1"
              >
                <div className="flex w-full items-center gap-2">
                  <Package className="size-4 shrink-0" />
                  <span className="font-medium">{item.title}</span>
                  {item.typeName && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.typeName}
                    </span>
                  )}
                  {!item.typeName && item.room && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.room}
                    </span>
                  )}
                </div>
                {item.snippet && (
                  <span
                    className="ml-6 text-xs text-muted-foreground line-clamp-1 [&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        {query.length < 2 && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => navigate('/')}>
                <LayoutDashboard className="size-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => navigate('/items')}>
                <Package className="size-4" />
                Collection
              </CommandItem>
              <CommandItem onSelect={() => navigate('/types')}>
                <Shapes className="size-4" />
                Item Types
              </CommandItem>
              <CommandItem onSelect={() => navigate('/vendors')}>
                <Store className="size-4" />
                Vendors
              </CommandItem>
              <CommandItem onSelect={() => navigate('/rooms')}>
                <Home className="size-4" />
                Rooms
              </CommandItem>
              <CommandItem onSelect={() => navigate('/analytics')}>
                <TrendingUp className="size-4" />
                Analytics
              </CommandItem>
              <CommandItem onSelect={() => navigate('/settings')}>
                <Settings className="size-4" />
                Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => navigate('/items/new')}>
                <Plus className="size-4" />
                Add Item
              </CommandItem>
              <CommandItem onSelect={() => navigate('/vendors/new')}>
                <Store className="size-4" />
                Add Vendor
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
