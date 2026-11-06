/**
 * Unit tests for the EditAccountForm client component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Form renders with account data pre-populated
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - Cancel button navigates back to account detail
 * - Archive button deletes the account
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditAccountForm } from '@/app/crm/accounts/[id]/edit/EditAccountForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockAccount = {
  id: 'account_123',
  name: 'Acme Corporation',
  website: 'https://acme.example.com',
  address: '123 Main Street',
  status: 'active',
};

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ id: 'account_123', name: 'Acme Corp' }), {
      status: 200,
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

describe('EditAccountForm - rendering', () => {
  it('renders the form with account data pre-populated', () => {
    render(<EditAccountForm account={mockAccount} />);
    expect(screen.getByRole('heading', { name: 'Edit Account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Name/)).toHaveValue('Acme Corporation');
    expect(screen.getByLabelText('Website')).toHaveValue('https://acme.example.com');
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main Street');
    expect(screen.getByLabelText(/Status/)).toHaveValue('active');
  });

  it('marks Account Name as required', () => {
    render(<EditAccountForm account={mockAccount} />);
    const label = screen.getByText(/Account Name/);
    expect(label.closest('label')).toHaveTextContent('*');
  });

  it('marks Status as required', () => {
    render(<EditAccountForm account={mockAccount} />);
    const label = screen.getByText(/Status/);
    expect(label.closest('label')).toHaveTextContent('*');
  });
});

describe('EditAccountForm - form interaction', () => {
  it('updates form fields', () => {
    render(<EditAccountForm account={mockAccount} />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corp LLC' },
    });
    fireEvent.change(screen.getByLabelText('Website'), {
      target: { value: 'https://acme-corp.example.com' },
    });

    expect(screen.getByLabelText(/Account Name/)).toHaveValue('Acme Corp LLC');
    expect(screen.getByLabelText('Website')).toHaveValue('https://acme-corp.example.com');
  });

  it('submits valid account data to the API', async () => {
    render(<EditAccountForm account={mockAccount} />);

    fireEvent.change(screen.getByLabelText(/Account Name/), {
      target: { value: 'Acme Corp LLC' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/crm/accounts/account_123');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.name).toBe('Acme Corp LLC');
    expect(body.website).toBe('https://acme.example.com');
    expect(body.organizationId).toBeUndefined();
  });

  it('navigates to account detail on successful update', async () => {
    render(<EditAccountForm account={mockAccount} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/accounts/account_123');
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

    render(<EditAccountForm account={mockAccount} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Account' }));

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'account_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Save Account' })).not.toBeDisabled();
  });
});

describe('EditAccountForm - error handling', () => {
  it('displays API error message on failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<EditAccountForm account={mockAccount} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<EditAccountForm account={mockAccount} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Account' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Unable to update account')).toBeInTheDocument();
  });
});

describe('EditAccountForm - cancel and archive', () => {
  it('navigates to account detail on cancel', () => {
    render(<EditAccountForm account={mockAccount} />);

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBeGreaterThan(0);
    fireEvent.click(cancelButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/crm/accounts/account_123');
  });

  it('archives account on archive button click', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EditAccountForm account={mockAccount} />);

    const archiveButtons = screen.getAllByRole('button', { name: /Archive Account/ });
    expect(archiveButtons.length).toBeGreaterThan(0);
    fireEvent.click(archiveButtons[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockConfirm).toHaveBeenCalledWith('Archive this account?');
    expect(mockPush).toHaveBeenCalledWith('/crm/accounts');
    expect(mockRefresh).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });
});
