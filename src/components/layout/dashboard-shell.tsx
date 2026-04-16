'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { AuthUser } from '@/lib/auth-helpers';

interface DashboardShellProps {
  user: AuthUser;
  counts: { items: number; vendors: number };
  children: React.ReactNode;
}

export function DashboardShell({ user, counts, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Global keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: 'n',
        meta: true,
        handler: () => {
          // Cmd+N: new item (when on items/dashboard)
          if (pathname === '/' || pathname.startsWith('/items')) {
            router.push('/items/new');
          }
        },
      },
    ],
    [pathname, router],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} counts={counts} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[260px] p-0 border-0 bg-primary [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Main application navigation
          </SheetDescription>
          <Sidebar
            user={user}
            counts={counts}
            mobile
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMobileMenuToggle={() => setSidebarOpen(true)}
          onCommandPaletteOpen={() => setCommandOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
