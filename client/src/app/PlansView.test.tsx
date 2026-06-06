import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlansView } from './PlansView';
import { router } from './router';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';

vi.mock('@/planner/persistence/api', () => ({
  listPlans: vi.fn(),
  loadPlanFromServer: vi.fn(),
  deletePlanFromServer: vi.fn(),
}));
import * as api from '@/planner/persistence/api';

const listPlans = api.listPlans as unknown as ReturnType<typeof vi.fn>;

let navigate: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  listPlans.mockReset();
  // Spy on the (imperative) router so navigation is asserted without side effects.
  navigate = vi.spyOn(router, 'navigate').mockResolvedValue(undefined);
});

afterEach(() => {
  navigate.mockRestore();
});

describe('PlansView', () => {
  it('lists plans and opens one by routing to its URL', async () => {
    listPlans.mockResolvedValue([
      { id: 1, name: 'House', createdAt: '', updatedAt: new Date(0).toISOString() },
    ]);

    render(<PlansView />);
    await screen.findByText('House');

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/editor/$planId', params: { planId: '1' } });
  });

  it('starts a new blank plan and routes to the editor', async () => {
    usePlannerStore.getState().setScene(makeSampleScene());
    listPlans.mockResolvedValue([]);

    render(<PlansView />);
    await screen.findByText(/No saved plans/i);
    fireEvent.click(screen.getAllByRole('button', { name: /New plan/i })[0]);

    // resetScene() clears the sample scene...
    expect(usePlannerStore.getState().scene.name).not.toBe('Sample Plan');
    // ...and we route to the new-editor URL.
    expect(navigate).toHaveBeenCalledWith({ to: '/editor' });
  });

  it('shows an error state when the API is unreachable', async () => {
    listPlans.mockRejectedValue(new Error('Failed to fetch'));
    render(<PlansView />);
    expect(await screen.findByText(/Couldn’t load plans/i)).toBeInTheDocument();
  });
});
