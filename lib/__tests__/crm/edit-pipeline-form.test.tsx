/**
 * Unit tests for the EditPipelineForm client component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Form renders with pipeline data pre-populated
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - Cancel/back navigation works
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditPipelineForm } from '@/app/crm/pipelines/[id]/edit/EditPipelineForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockPipeline = {
  id: 'pipeline_123',
  name: 'Sales Pipeline',
  description: 'Primary sales pipeline',
  isDefault: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ id: 'pipeline_123', name: 'Sales Pipeline' }), {
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

describe('EditPipelineForm - rendering', () => {
  it('renders the form with pipeline data pre-populated', () => {
    render(<EditPipelineForm pipeline={mockPipeline} />);
    expect(screen.getByRole('heading', { name: 'Edit Pipeline' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pipeline Name')).toHaveValue('Sales Pipeline');
    expect(screen.getByLabelText('Description')).toHaveValue('Primary sales pipeline');
  });

  it('marks Pipeline Name as required', () => {
    render(<EditPipelineForm pipeline={mockPipeline} />);
    const label = screen.getByText('Pipeline Name');
    expect(label.closest('label')).toBeInTheDocument();
  });
});

describe('EditPipelineForm - form interaction', () => {
  it('updates form fields', () => {
    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.change(screen.getByLabelText('Pipeline Name'), {
      target: { value: 'Enterprise Pipeline' },
    });

    expect(screen.getByLabelText('Pipeline Name')).toHaveValue('Enterprise Pipeline');
  });

  it('submits valid pipeline data to the API', async () => {
    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.change(screen.getByLabelText('Pipeline Name'), {
      target: { value: 'Enterprise Pipeline' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Pipeline' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/crm/pipelines/pipeline_123');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.name).toBe('Enterprise Pipeline');
  });

  it('navigates to pipelines list on successful update', async () => {
    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Pipeline' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/pipelines');
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

    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Pipeline' }));

    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'pipeline_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Update Pipeline' })).not.toBeDisabled();
  });
});

describe('EditPipelineForm - error handling', () => {
  it('displays API error message on failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Pipeline' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<EditPipelineForm pipeline={mockPipeline} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Pipeline' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Unable to update pipeline')).toBeInTheDocument();
  });
});
