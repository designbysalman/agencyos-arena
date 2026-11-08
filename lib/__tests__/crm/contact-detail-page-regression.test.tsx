/**
 * Regression test for Contact Detail page loading-state loop.
 *
 * Verifies that the contact is fetched exactly once on initial load and that
 * no repeated fetching / loading-state loop occurs when the page is idle.
 * This guards against the bug where `toast` (a non-referentially-stable
 * function from `useToast()`) was included in the `useEffect` dependency
 * array, causing the effect to re-run on every render and triggering an
 * infinite fetch loop.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ContactDetailPage from '@/app/crm/contacts/[id]/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockRouter = { push: mockPush, refresh: mockRefresh };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockContact = {
  id: 'contact_1',
  organizationId: 'org_1',
  accountId: null,
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '5551234567',
  status: 'active',
  source: 'website',
  isMasked: false,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
};

function contactApiCallCount() {
  return mockFetch.mock.calls.filter(
    ([url]) => typeof url === 'string' && url.includes('/api/v1/crm/contacts/')
  ).length;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : String(url);
    if (u.includes('/api/v1/crm/contacts/')) {
      return Promise.resolve(
        new Response(JSON.stringify(mockContact), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
  mockPush.mockReset();
  mockRefresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Contact Detail page - loading-state loop regression', () => {
  it('fetches the contact exactly once on initial load and does not re-fetch while idle', async () => {
    render(<ContactDetailPage params={{ id: 'contact_1' }} />);

    // Wait for the contact to load
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Should be exactly 1 call on initial load
    expect(contactApiCallCount()).toBe(1);

    // Wait additional time to catch any loading-state loop
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should still be exactly 1 call — no repeated fetching
    expect(contactApiCallCount()).toBe(1);
  });

  it('shows loading state during initial fetch, then hides it', async () => {
    let resolveFetch: (val: Response) => void = () => {};
    mockFetch.mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : String(url);
      if (u.includes('/api/v1/crm/contacts/')) {
        return new Promise((resolve) => {
          resolveFetch = resolve as (val: Response) => void;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<ContactDetailPage params={{ id: 'contact_1' }} />);

    // Should show loading state while fetch is pending
    expect(screen.getByText(/Loading contact…/)).toBeInTheDocument();

    // Resolve the fetch
    resolveFetch(
      new Response(JSON.stringify(mockContact), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Loading state should be gone after fetch completes
    expect(screen.queryByText(/Loading contact…/)).not.toBeInTheDocument();
  });

  it('deletes the contact and navigates back to the contacts list', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockFetch.mockImplementation((url: string | URL, options?: RequestInit) => {
      const u = typeof url === 'string' ? url : String(url);
      if (u.includes('/api/v1/crm/contacts/') && options?.method === 'DELETE') {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 'contact_1', deletedAt: new Date() }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (u.includes('/api/v1/crm/contacts/')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockContact), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<ContactDetailPage params={{ id: 'contact_1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Call count should be 1 (initial GET) before delete
    expect(contactApiCallCount()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/crm/contacts');
    });

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this contact?');

    mockConfirm.mockRestore();
  });
});
