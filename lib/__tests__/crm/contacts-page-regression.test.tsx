/**
 * Regression test for Contacts page loading-state loop.
 *
 * Verifies that contacts are fetched exactly once on initial load and that
 * no repeated fetching / loading-state loop occurs when the page is idle.
 * This guards against the bug where `toast` (a non-referentially-stable
 * function from `useToast()`) was included in the `useEffect` dependency
 * array, causing the effect to re-run on every render and triggering an
 * infinite fetch loop.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import ContactsPage from '@/app/crm/contacts/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockContactsResponse = {
  contacts: [
    {
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
    },
  ],
  total: 1,
  totalPages: 1,
  page: 1,
};

function contactsApiCallCount() {
  return mockFetch.mock.calls.filter(
    ([url]) => typeof url === 'string' && url.includes('/api/v1/crm/contacts')
  ).length;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : String(url);
    if (u.includes('/api/v1/crm/contacts')) {
      return Promise.resolve(
        new Response(JSON.stringify(mockContactsResponse), {
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

describe('Contacts page - loading-state loop regression', () => {
  it('fetches contacts exactly once on initial load and does not re-fetch while idle', async () => {
    render(<ContactsPage />);

    // Wait for the initial contacts fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Should be exactly 1 call on initial load
    expect(contactsApiCallCount()).toBe(1);

    // Wait additional time to catch any loading-state loop
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should still be exactly 1 call — no repeated fetching
    expect(contactsApiCallCount()).toBe(1);
  });

  it('shows loading state during initial fetch, then hides it', async () => {
    let resolveFetch: (val: Response) => void = () => {};
    mockFetch.mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : String(url);
      if (u.includes('/api/v1/crm/contacts')) {
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

    render(<ContactsPage />);

    // Should show loading state while fetch is pending
    expect(screen.getByText(/Loading contacts…/)).toBeInTheDocument();

    // Resolve the fetch
    resolveFetch(
      new Response(JSON.stringify(mockContactsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Loading state should be gone after fetch completes
    expect(screen.queryByText(/Loading contacts…/)).not.toBeInTheDocument();
  });

  it('does not enter a fetch loop when contacts list is empty', async () => {
    mockFetch.mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : String(url);
      if (u.includes('/api/v1/crm/contacts')) {
        return Promise.resolve(
          new Response(JSON.stringify({ contacts: [], total: 0, totalPages: 0, page: 1 }), {
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

    render(<ContactsPage />);

    // Wait for the empty state to render
    await waitFor(() => {
      expect(screen.getByText('No contacts found.')).toBeInTheDocument();
    });

    // Should be exactly 1 call even with empty results
    expect(contactsApiCallCount()).toBe(1);

    // Wait additional time to confirm no loop with empty data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(contactsApiCallCount()).toBe(1);
  });
});
