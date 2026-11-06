/**
 * Unit tests for the New Account page component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Page renders with all required form fields
 * - Account name is a required field
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - Cancel button navigates back to accounts list
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NewAccountPage from '@/app/crm/accounts/new/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ id: 'new_account', name: 'Acme Corp' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  mockPush.mockReset();
  mockRefresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('New Account page - rendering', () => {
  it('renders the page title and form', () => {
    render(<NewAccountPage />);
    expect(screen.getByRole('heading', { name: 'New Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders all account form fields', () => {
    render(<NewAccountPage />);
    expect(screen.getByLabelText(/Account Name/)).toBeInTheDocument();
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/)).toBeInTheDocument();
  });

  it('marks Account Name as required', () => {
    render(<NewAccountPage />);
    const label = screen.getByText(/Account Name/);
    expect(label.closest('label')).toHaveTextContent('*');
  });
});

describe('New Account page - form interaction', () => {
  it('fills in form fields', () => {
    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });
    fireEvent.change(screen.getByLabelText('Website'), {
      target: { value: 'https://acme.example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText(/Status/), {
      target: { value: 'active' },
    });

    expect(screen.getByLabelText(/Account Name/)).toHaveValue('Acme Corporation');
    expect(screen.getByLabelText('Website')).toHaveValue('https://acme.example.com');
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main Street');
  });

  it('submits valid account data to the API', async () => {
    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });
    fireEvent.change(screen.getByLabelText('Website'), {
      target: { value: 'https://acme.example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/crm/accounts');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.name).toBe('Acme Corporation');
    expect(body.website).toBe('https://acme.example.com');
    expect(body.organizationId).toBeUndefined();
  });

  it('navigates to accounts list on successful creation', async () => {
    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/accounts');
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

    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(
      screen.getByRole('button', { name: 'Creating...' })
    ).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'new_account' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
  });
});

describe('New Account page - error handling', () => {
  it('displays API error message on failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Invalid request body')).toBeInTheDocument();
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<NewAccountPage />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corporation' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});

describe('New Account page - cancel navigation', () => {
  it('navigates back to accounts list on cancel', () => {
    render(<NewAccountPage />);

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBeGreaterThan(0);
    fireEvent.click(cancelButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/crm/accounts');
  });
});
