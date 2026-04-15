'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Sun, Moon, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onCommandPaletteOpen: () => void;
}

const breadcrumbLabels: Record<string, string> = {
  '': 'Dashboard',
  items: 'Collection',
  types: 'Item Types',
  vendors: 'Vendors',
  rooms: 'Rooms',
  analytics: 'Analytics',
  settings: 'Settings',
  admin: 'Admin',
  new: 'New',
  edit: 'Edit',
  billing: 'Billing',
  users: 'Users',
};

export function Header({ onMobileMenuToggle, onCommandPaletteOpen }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((seg, i) => ({
      label: breadcrumbLabels[seg] ?? seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Breadcrumbs */}
      <nav className="hidden items-center gap-1 text-sm sm:flex">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            {i < crumbs.length - 1 ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search shortcut */}
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={onCommandPaletteOpen}
      >
        Search...
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>

      {/* Add Item */}
      <Button asChild size="sm">
        <Link href="/items/new">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Link>
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  );
}
