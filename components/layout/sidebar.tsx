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

  return (
    <aside
      className={classNames(
        'fixed inset-y-0 left-0 z-50 border-r border-border bg-background transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64',
        // Desktop: always visible
        'sm:translate-x-0',
        // Mobile: off-screen by default, slides in when open
        'translate-x-full sm:!translate-x-0',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center justify-between gap-4 border-b border-border bg-background p-4 shrink-0">
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-tight text-accent">
              AgencyOS
            </h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronRight
              className={classNames(
                'w-4 h-4 transition-transform duration-200',
                isCollapsed ? 'rotate-180' : ''
              )}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={classNames(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
