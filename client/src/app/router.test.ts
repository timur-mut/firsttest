import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/planner/persistence/api', () => ({
  loadPlanFromServer: vi.fn(),
  // PlansView is referenced by the route tree and imports these at module load.
  listPlans: vi.fn().mockResolvedValue([]),
  deletePlanFromServer: vi.fn(),
}));
import * as api from '@/planner/persistence/api';

import { createMemoryHistory } from '@tanstack/react-router';
import { createAppRouter } from './router';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';

const loadPlan = api.loadPlanFromServer as unknown as ReturnType<typeof vi.fn>;

function routerAt(path: string) {
  return createAppRouter(createMemoryHistory({ initialEntries: [path] }));
}

beforeEach(() => {
  loadPlan.mockReset();
  usePlannerStore.getState().resetScene();
});

describe('app router', () => {
  it('shows the plans list at "/"', async () => {
    const router = routerAt('/');
    await router.load();
    expect(router.state.location.pathname).toBe('/');
    expect(loadPlan).not.toHaveBeenCalled();
  });

  it('loads the plan for "/editor/$planId" via the route loader', async () => {
    loadPlan.mockResolvedValue(makeSampleScene());
    const router = routerAt('/editor/1');
    await router.load();

    expect(loadPlan).toHaveBeenCalledWith(1);
    expect(usePlannerStore.getState().scene.name).toBe('Sample Plan');
    expect(router.state.location.pathname).toBe('/editor/1');
  });

  it('does not load a plan for the new-editor route "/editor"', async () => {
    const router = routerAt('/editor');
    await router.load();
    expect(loadPlan).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('rejects a non-numeric plan id without calling the API', async () => {
    const router = routerAt('/editor/abc');
    await router.load();
    expect(loadPlan).not.toHaveBeenCalled();
  });
});
