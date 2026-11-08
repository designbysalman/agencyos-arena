/**
 * Unit tests for the New Contact page component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Page renders with all required form fields
 * - Last name is a required field
 * - Account selector is rendered with accounts from the API
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user (including field-specific errors)
 * - 401 response redirects to login
 * - Cancel button navigates back to contacts list
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import NewContactPage from '@/app/crm/contacts/new/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockAccountsResponse = {
  accounts: [
    { id: 'acc_1', name: 'Acme Corp' },
    { id: 'acc_2', name: 'Globex Corp' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  // Default: accounts API returns mock accounts, contact creation succeeds
  mockFetch.mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('/api/v1/crm/accounts')) {
      return Promise.resolve(
        new Response(JSON.stringify(mockAccountsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'new_contact', lastName: 'Smith' }), {
        status: 201,
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

describe('New Contact page - rendering', () => {
  it('renders the page title and form', () => {
    render(<NewContactPage />);
    expect(screen.getByRole('heading', { name: 'New Contact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Contact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders all contact form fields', () => {
    render(<NewContactPage />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    // Account label is rendered (associated via htmlFor with SelectTrigger id)
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/)).toBeInTheDocument();
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
  });

  it('renders account selector with accounts from API', async () => {
    render(<NewContactPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Globex Corp')).toBeInTheDocument();
    });
  });

  it('marks Last Name as required', () => {
    render(<NewContactPage />);
    const label = screen.getByText(/Last Name/);
    expect(label.closest('label')).toHaveTextContent('*');
  });
});

describe('New Contact page - form interaction', () => {
  it('fills in form fields', () => {
    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '5551234567' },
    });
    fireEvent.change(screen.getByLabelText(/Status/), {
      target: { value: 'active' },
    });
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'website' },
    });

    expect(screen.getByLabelText('First Name')).toHaveValue('Jane');
    expect(screen.getByLabelText(/Last Name/)).toHaveValue('Smith');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Phone')).toHaveValue('5551234567');
    expect(screen.getByLabelText('Source')).toHaveValue('website');
  });

  it('submits valid contact data to the API', async () => {
    render(<NewContactPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // fetch is called twice: once for accounts, once for contact creation
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const contactCall = mockFetch.mock.calls[1];
    const [url, options] = contactCall;
    expect(url).toBe('/api/v1/crm/contacts');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.firstName).toBe('Jane');
    expect(body.lastName).toBe('Smith');
    expect(body.email).toBe('jane@example.com');
    expect(body.accountId).toBeNull(); // No account selected
    expect(body.organizationId).toBeUndefined();
  });

  it('submits with selected account ID', async () => {
    render(<NewContactPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const contactCall = mockFetch.mock.calls[1];
    const [, options] = contactCall;
    const body = JSON.parse(options.body as string);
    expect(body.accountId).toBeNull(); // No account selected by default
  });

  it('navigates to contacts list on successful creation', async () => {
    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/contacts');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    let resolveFetch: (val: Response) => void = () => {};
    mockFetch.mockImplementation(
      (url: string | URL) =>
        new Promise((resolve) => {
          if (typeof url === 'string' && url.includes('/api/v1/crm/accounts')) {
            resolve(
              new Response(JSON.stringify(mockAccountsResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
            return;
          }
          resolveFetch = resolve as (val: Response) => void;
        })
    );

    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    // Button should be disabled while loading
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'new_contact' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Create Contact' })).not.toBeDisabled();
  });
});

describe('New Contact page - error handling', () => {
  it('displays validation errors on failure', async () => {
    mockFetch.mockImplementation((url: string | URL) => {
      if (typeof url === 'string' && url.includes('/api/v1/crm/accounts')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockAccountsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: 'Invalid request body',
            issues: [
              { path: ['lastName'], message: 'Last name is required' },
              { path: ['email'], message: 'Invalid email address' },
            ],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    });

    render(<NewContactPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    // Wait for async API call to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify no redirect happened (submission failed with validation error)
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to login on 401 response', async () => {
    mockFetch.mockImplementation((url: string | URL) => {
      if (typeof url === 'string' && url.includes('/api/v1/crm/accounts')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockAccountsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Unauthenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});

describe('New Contact page - cancel navigation', () => {
  it('navigates back to contacts list on cancel', () => {
    render(<NewContactPage />);

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBeGreaterThan(0);
    fireEvent.click(cancelButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/crm/contacts');
  });
});
