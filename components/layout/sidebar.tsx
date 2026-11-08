'use client';

import * as React from 'react';
import NextLink from 'next/link';
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
  Receipt,
  CreditCard,
  Settings,
  Mail,
  ChevronLeft,
  Menu,
  X,
  File,
  Link as LinkIcon,
  Clock,
  Bell,
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
  { name: 'Quotations', href: '/sales/quotations', icon: Receipt },
  { name: 'Invoices', href: '/finance/invoices', icon: CreditCard },
  { name: 'Estimates', href: '/finance/estimates', icon: FileText },
  { name: 'Expenses', href: '/finance/expenses', icon: Receipt },
  { name: 'Reports', href: '/finance/reports', icon: DollarSign },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Templates', href: '/projects/templates', icon: File },
  { name: 'Change Orders', href: '/projects/change-orders', icon: LinkIcon },
  { name: 'Time Entries', href: '/projects/time-entries', icon: Clock },
  { name: 'Automation', href: '/automation/workflows', icon: Mail },
  { name: 'Workflows', href: '/automation/rules', icon: Mail },
  { name: 'Notifications', href: '/automation/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Documents', href: '/documents/contracts', icon: File },
  { name: 'Contracts', href: '/documents/contracts', icon: FileText },
  { name: 'Templates', href: '/documents/templates', icon: File },
  { name: 'Shared Links', href: '/documents/links', icon: LinkIcon },
];

export function Sidebar({ isCollapsed, setIsCollapsed, isOpen = false, setIsOpen }: SidebarProps) {
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
    isCollapsed ? 'sm:w-16' : 'sm:w-64' // desktop: collapsed/expanded
  );

  // Translate: off-screen to the LEFT when closed (mobile only).
  // Desktop is always visible via sm:!translate-x-0.
  const sidebarTranslate = classNames(
    '-translate-x-full sm:!translate-x-0',
    isOpen ? 'translate-x-0' : '-translate-x-full'
  );

  // Expanded: labels shown and expanded-style active states.
  // True when desktop is expanded OR mobile drawer is open,
  // independent of the desktop collapsed state.
  const expanded = isOpen || !isCollapsed;

  return (
    <aside
      className={classNames(
        'fixed inset-y-0 left-0 z-50 border-r border-border bg-background transition-all duration-300 ease-in-out',
        sidebarWidth,
        sidebarTranslate
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center justify-between border-b border-border bg-background p-4 shrink-0 relative">
          {/* AgencyOS logo: shown when sidebar is expanded (desktop or open mobile drawer) */}
          {expanded && <h1 className="text-xl font-bold tracking-tight text-accent">AgencyOS</h1>}

          {/* Right-aligned toggle: collapse chevron (expanded desktop) or close button (open mobile drawer) */}
          {expanded && (
            <button
              onClick={isOpen ? () => setIsOpen?.(false) : () => setIsCollapsed(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
              aria-label={isOpen ? 'Close sidebar' : 'Collapse sidebar'}
            >
              {isOpen ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          )}

          {/* Centered hamburger: shown only when sidebar is collapsed (desktop collapsed) */}
          {isCollapsed && !isOpen && (
            <div className="absolute inset-x-0 flex items-center justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
                aria-label="Expand sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NextLink
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen?.(false)}
                className={classNames(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive && expanded
                    ? 'bg-accent text-accent-foreground'
                    : isActive && !expanded
                      ? 'text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-label={item.name}
              >
                {/* Centered square active state for collapsed desktop only */}
                <div
                  className={classNames(
                    'flex items-center justify-center w-8 h-8 shrink-0 rounded-md transition-colors',
                    isActive && !expanded
                      ? 'bg-accent text-accent-foreground'
                      : isActive && expanded
                        ? 'text-accent-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                {expanded && <span className="min-w-0">{item.name}</span>}
              </NextLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
