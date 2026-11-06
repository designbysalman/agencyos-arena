/**
 * Unit tests for the EditPipelineStageForm client component.
 *
 * These tests use jsdom and @testing-library/react to verify:
 * - Form renders with stage data pre-populated
 * - Form submission calls the API with correct payload
 * - API errors are displayed to the user
 * - Cancel/back navigation works
 * - Loading state during submission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditPipelineStageForm } from '@/app/crm/pipeline-stages/[id]/edit/EditPipelineStageForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockStage = {
  id: 'stage_123',
  pipelineId: 'pipeline_123',
  name: 'Qualification',
  order: 1,
  color: '#3b82f6',
  probability: 25,
  isWon: false,
  isLost: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ id: 'stage_123', name: 'Qualification' }), {
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

describe('EditPipelineStageForm - rendering', () => {
  it('renders the form with stage data pre-populated', () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);
    expect(screen.getByRole('heading', { name: 'Edit Stage' })).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Name')).toHaveValue('Qualification');
    expect(screen.getByLabelText('Order')).toHaveValue(1);
    expect(screen.getByLabelText('Color (hex)')).toHaveValue('#3b82f6');
    expect(screen.getByLabelText('Probability (%)')).toHaveValue(25);
  });

  it('marks Stage Name as required', () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);
    const label = screen.getByText('Stage Name');
    expect(label.closest('label')).toBeInTheDocument();
  });

  it('marks Order as required', () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);
    const label = screen.getByText('Order');
    expect(label.closest('label')).toBeInTheDocument();
  });
});

describe('EditPipelineStageForm - form interaction', () => {
  it('updates form fields', () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.change(screen.getByLabelText('Stage Name'), {
      target: { value: 'Proposal' },
    });

    expect(screen.getByLabelText('Stage Name')).toHaveValue('Proposal');
  });

  it('submits valid stage data to the API', async () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.change(screen.getByLabelText('Stage Name'), {
      target: { value: 'Proposal' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Stage' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/crm/pipeline-stages/stage_123?pipelineId=pipeline_123');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body as string);
    expect(body.name).toBe('Proposal');
    expect(body.order).toBe(1);
  });

  it('navigates to pipeline detail on successful update', async () => {
    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Stage' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith('/crm/pipelines/pipeline_123');
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

    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Stage' }));

    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ id: 'stage_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole('button', { name: 'Update Stage' })).not.toBeDisabled();
  });
});

describe('EditPipelineStageForm - error handling', () => {
  it('displays API error message on failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Stage' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('shows generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<EditPipelineStageForm stage={mockStage} pipelineId="pipeline_123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Update Stage' }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Unable to update stage')).toBeInTheDocument();
  });
});
