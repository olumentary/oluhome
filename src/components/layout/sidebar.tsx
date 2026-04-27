'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Shapes,
  Store,
  Home,
  TrendingUp,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { signOutAction } from '@/app/(dashboard)/actions';
import type { AuthUser } from '@/lib/auth-helpers';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

interface SidebarProps {
  user: AuthUser;
  counts: { items: number; vendors: number };
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ user, counts, mobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Collection', href: '/items', icon: Package, badge: counts.items },
    { label: 'Item Types', href: '/types', icon: Shapes },
    { label: 'Vendors', href: '/vendors', icon: Store, badge: counts.vendors },
    { label: 'Rooms', href: '/rooms', icon: Home },
    { label: 'Analytics', href: '/analytics', icon: TrendingUp },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user.role === 'admin',
  );

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-primary',
        !mobile && 'w-[260px] shrink-0',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-xl font-bold text-white"
        >
          Curiolu
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1 py-2">
          {filteredItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors',
                  active && 'border-l-2 border-white bg-white/10 text-white',
                  !active && 'border-l-2 border-transparent hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.name}
            </p>
            <Badge
              variant="secondary"
              className="mt-0.5 border-0 bg-white/15 text-[10px] capitalize text-white/80"
            >
              {user.plan}
            </Badge>
          </div>
        </div>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
