/**
 * Unit tests for the New Contact page component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Page renders with all required form fields
 * - Last name is a required field
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - 401 response redirects to login
 * - Cancel button navigates back to contacts list
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NewContactPage from '@/app/crm/contacts/new/page';

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
    new Response(JSON.stringify({ id: 'new_contact', lastName: 'Smith' }), {
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
    expect(screen.getByLabelText('Account ID')).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/)).toBeInTheDocument();
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
  });

  it('marks Last Name as required', () => {
    render(<NewContactPage />);
    // The label element contains "Last Name *" where * indicates required
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
    fireEvent.change(screen.getByLabelText('Account ID'), {
      target: { value: 'acc_123' },
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
    expect(screen.getByLabelText('Account ID')).toHaveValue('acc_123');
    expect(screen.getByLabelText('Source')).toHaveValue('website');
  });

  it('submits valid contact data to the API', async () => {
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

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/crm/contacts');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.firstName).toBe('Jane');
    expect(body.lastName).toBe('Smith');
    expect(body.email).toBe('jane@example.com');
    expect(body.organizationId).toBeUndefined();
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
      () =>
        new Promise((resolve) => {
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
  it('displays API error message on failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<NewContactPage />);

    fireEvent.change(screen.getByLabelText(/Last Name/), {
      target: { value: 'Smith' },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create Contact' });
    fireEvent.click(createButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Invalid request body')).toBeInTheDocument();
  });

  it('redirects to login on 401 response', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

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
