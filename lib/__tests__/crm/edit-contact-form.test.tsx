/**
 * Unit tests for the EditContactForm client component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Form renders with contact data pre-populated
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - Cancel button navigates back to contact detail
 * - Archive button deletes the contact
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditContactForm } from '@/app/crm/contacts/[id]/edit/EditContactForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockContact = {
  id: 'contact_123',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '5551234567',
  accountId: 'account_123',
  status: 'active',
  source: 'website',
};

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : String(url);
    if (u.includes('/api/v1/crm/accounts')) {
      return Promise.resolve(
        new Response(JSON.stringify({ accounts: [{ id: 'account_123', name: 'Test Account' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'contact_123', lastName: 'Smith' }), {
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

describe('EditContactForm - rendering', () => {
  it('renders the form with contact data pre-populated', () => {
    render(<EditContactForm contact={mockContact} />);
    expect(screen.getByRole('heading', { name: 'Edit Contact' })).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toHaveValue('Jane');
    expect(screen.getByLabelText(/Last Name/)).toHaveValue('Smith');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Phone')).toHaveValue('5551234567');
    // Account ID label is rendered (Select dropdown for account selection)
    expect(screen.getByText('Account ID')).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/)).toHaveValue('active');
    expect(screen.getByLabelText('Source')).toHaveValue('website');
  });

  it('marks Last Name as required', () => {
    render(<EditContactForm contact={mockContact} />);
    const label = screen.getByText(/Last Name/);
    expect(label.closest('label')).toHaveTextContent('*');
  });

  it('marks Status as required', () => {
    render(<EditContactForm contact={mockContact} />);
    const label = screen.getByText(/Status/);
    expect(label.closest('label')).toHaveTextContent('*');
  });
});

describe('EditContactForm - form interaction', () => {
  it('updates form fields', () => {
    render(<EditContactForm contact={mockContact} />);

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smythe' },
    });

    expect(screen.getByLabelText('First Name')).toHaveValue('Janet');
    expect(screen.getByLabelText(/Last Name/)).toHaveValue('Smythe');
  });

  it('submits valid contact data to the API', async () => {
    render(<EditContactForm contact={mockContact} />);

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const contactCall = mockFetch.mock.calls[1];
    const [url, options] = contactCall;
    expect(url).toBe('/api/v1/crm/contacts/contact_123');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.firstName).toBe('Janet');
    expect(body.lastName).toBe('Smith');
    expect(body.organizationId).toBeUndefined();
  });

  it('navigates to contact detail on successful update', async () => {
    render(<EditContactForm contact={mockContact} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/contacts/contact_123');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    let resolveFetch: (val: Response) => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve as (val: Response) => void;
        })
    );

    render(<EditContactForm contact={mockContact} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'contact_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Save Contact' })).not.toBeDisabled();
  });
});

describe('EditContactForm - error handling', () => {
  it('displays API error message on failure', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    render(<EditContactForm contact={mockContact} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<EditContactForm contact={mockContact} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Unable to update contact')).toBeInTheDocument();
  });
});

describe('EditContactForm - cancel and archive', () => {
  it('navigates to contact detail on cancel', () => {
    render(<EditContactForm contact={mockContact} />);

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBeGreaterThan(0);
    fireEvent.click(cancelButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/crm/contacts/contact_123');
  });

  it('archives contact on archive button click', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mockFetchDelete = vi.fn();
    // Override fetch for DELETE calls
    mockFetch.mockImplementation((url: string | URL, options?: RequestInit) => {
      const u = typeof url === 'string' ? url : String(url);
      if (options?.method === 'DELETE') {
        mockFetchDelete(u, options);
        return Promise.resolve(
          new Response(JSON.stringify({ id: 'contact_123', deletedAt: new Date() }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      // Non-DELETE calls (e.g. accounts fetch on mount) return success
      if (u.includes('/api/v1/crm/accounts')) {
        return Promise.resolve(
          new Response(JSON.stringify({ accounts: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'contact_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<EditContactForm contact={mockContact} />);

    const archiveButtons = screen.getAllByRole('button', { name: /Archive Contact/ });
    expect(archiveButtons.length).toBeGreaterThan(0);
    fireEvent.click(archiveButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockConfirm).toHaveBeenCalledWith('Archive this contact?');
    expect(mockPush).toHaveBeenCalledWith('/crm/contacts');
    expect(mockRefresh).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });
});
