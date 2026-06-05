import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlansView } from './PlansView';
import { useAppStore } from './appStore';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';

vi.mock('@/planner/persistence/api', () => ({
  listPlans: vi.fn(),
  loadPlanFromServer: vi.fn(),
  deletePlanFromServer: vi.fn(),
}));
import * as api from '@/planner/persistence/api';

const listPlans = api.listPlans as unknown as ReturnType<typeof vi.fn>;
const loadPlan = api.loadPlanFromServer as unknown as ReturnType<typeof vi.fn>;
const deletePlan = api.deletePlanFromServer as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  useAppStore.setState({ view: 'plans', currentPlanId: null });
  listPlans.mockReset();
  loadPlan.mockReset();
  deletePlan.mockReset();
});

describe('PlansView', () => {
  it('lists plans and opens one into the editor', async () => {
    listPlans.mockResolvedValue([
      { id: 1, name: 'House', createdAt: '', updatedAt: new Date(0).toISOString() },
    ]);
    loadPlan.mockResolvedValue(makeSampleScene());

    render(<PlansView />);
    await screen.findByText('House');

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(useAppStore.getState().view).toBe('editor'));
    expect(loadPlan).toHaveBeenCalledWith(1);
    expect(useAppStore.getState().currentPlanId).toBe(1);
    expect(usePlannerStore.getState().scene.name).toBe('Sample Plan');
  });

  it('starts a new blank plan', async () => {
    listPlans.mockResolvedValue([]);
    render(<PlansView />);
    await screen.findByText(/No saved plans/i);
    fireEvent.click(screen.getAllByRole('button', { name: /New plan/i })[0]);
    expect(useAppStore.getState().view).toBe('editor');
    expect(useAppStore.getState().currentPlanId).toBeNull();
  });

  it('shows an error state when the API is unreachable', async () => {
    listPlans.mockRejectedValue(new Error('Failed to fetch'));
    render(<PlansView />);
    expect(await screen.findByText(/Couldn’t load plans/i)).toBeInTheDocument();
  });
});
