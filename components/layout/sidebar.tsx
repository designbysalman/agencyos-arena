'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LayoutDashboard as PipelinesIcon,
  Briefcase as LeadsIcon,
  DollarSign,
  FileText,
  CreditCard,
  Settings,
  Mail,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/crm/contacts', icon: Users },
  { name: 'Accounts', href: '/crm/accounts', icon: Briefcase },
  { name: 'Pipelines', href: '/crm/pipelines', icon: PipelinesIcon },
  { name: 'Leads', href: '/crm/leads', icon: LeadsIcon },
  { name: 'Opportunities', href: '/crm/opportunities', icon: DollarSign },
  { name: 'Proposals', href: '/sales/proposals', icon: FileText },
  { name: 'Invoices', href: '/finance/invoices', icon: CreditCard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Automation', href: '/automation/workflows', icon: Mail },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isOpen = false,
  setIsOpen,
}: SidebarProps) {
  const pathname = usePathname();

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && setIsOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [setIsOpen]);

  // Sidebar width: full width on mobile regardless of collapsed state;
  // desktop respects collapsed/expanded.
  const sidebarWidth = classNames(
    'w-64', // mobile default: full 256px
    isCollapsed ? 'sm:w-16' : 'sm:w-64', // desktop: collapsed/expanded
  );

  // Translate: off-screen to the LEFT when closed (mobile only).
  // Desktop is always visible via sm:!translate-x-0.
  const sidebarTranslate = classNames(
    '-translate-x-full sm:!translate-x-0',
    isOpen ? 'translate-x-0' : '-translate-x-full',
  );

  return (
    <aside
      className={classNames(
        'fixed inset-y-0 left-0 z-50 border-r border-border bg-background transition-all duration-300 ease-in-out',
        sidebarWidth,
        sidebarTranslate,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center justify-between gap-4 border-b border-border bg-background p-4 shrink-0">
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-tight text-accent">
              AgencyOS
            </h1>
          )}
          {/* Sidebar toggle on desktop is handled by TopNav hamburger.
              On mobile, TopNav hamburger opens/closes the drawer.
              No duplicate toggle control in sidebar header. */}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            // Mobile drawer (isOpen) always renders labels and expanded-style
            // active states, independent of the desktop collapsed state.
            const expanded = isOpen || !isCollapsed;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen?.(false)}
                className={classNames(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive && expanded
                    ? 'bg-accent text-accent-foreground'
                    : isActive && !expanded
                      ? 'text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
                aria-label={item.name}
              >
                {/* Centered square active state for collapsed desktop only */}
                <div
                  className={classNames(
                    'flex items-center justify-center w-8 h-8 shrink-0 rounded-md transition-colors',
                    isActive && !expanded
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                {expanded && <span className="min-w-0">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
