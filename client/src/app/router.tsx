// App router (TanStack Router, code-based). The plans list is the home route
// ("/"). Opening a plan navigates to "/editor/$planId", so the open plan's id
// lives in the URL — a direct visit, reload, or shared link of that URL loads
// the plan. A new/unsaved plan uses "/editor".
//
// The planner is a self-contained editor whose deep components (e.g. TopBar)
// are unit-tested by rendering them WITHOUT a RouterProvider. So rather than
// router hooks (which need that context), those components import this `router`
// singleton and call `router.navigate(...)` imperatively. router <-> planner is
// therefore an import cycle, which resolves because every use of the cyclic
// bindings is deferred to render/click time, not module-evaluation time.

import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import { PlansView } from './PlansView';
import { PlannerApp } from '@/planner/PlannerApp';
import { usePlannerStore } from '@/planner/store';
import { useReferenceImageStore } from '@/planner/store/referenceImageStore';
import { loadPlanFromServer } from '@/planner/persistence/api';
import { Button } from '@/components/ui/button';

// Shown when "/editor/$planId" fails to load (deleted plan, bad id, API down).
function PlanLoadError() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
      <p className="text-sm font-medium">Couldn’t open this plan.</p>
      <p className="text-xs text-muted-foreground">
        It may have been deleted, or the API is unreachable.
      </p>
      <Button variant="outline" size="sm" onClick={() => router.navigate({ to: '/' })}>
        Back to plans
      </Button>
    </div>
  );
}

/**
 * Build a fresh router (and its own route tree). The production singleton is
 * `router` below; tests pass a memory history to get an isolated instance.
 */
export function createAppRouter(history?: RouterHistory) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });

  // "/" — the saved-plans list (the default screen).
  const plansRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: PlansView,
  });

  // "/editor" — a new, unsaved plan (not yet bound to a saved id).
  const editorRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/editor',
    component: PlannerApp,
  });

  // "/editor/$planId" — an existing saved plan. The loader fetches the scene by
  // id and loads it into the planner store before the editor renders, so a
  // direct visit / reload of this URL restores the plan.
  const editorPlanRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/editor/$planId',
    loader: async ({ params }) => {
      const id = Number(params.planId);
      if (!Number.isFinite(id)) throw new Error(`Invalid plan id: ${params.planId}`);
      const { scene, referenceImage } = await loadPlanFromServer(id);
      usePlannerStore.getState().setScene(scene);
      useReferenceImageStore.getState().hydrate(referenceImage);
      return { id };
    },
    component: PlannerApp,
    errorComponent: PlanLoadError,
  });

  const routeTree = rootRoute.addChildren([plansRoute, editorRoute, editorPlanRoute]);
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * The saved-plan id the editor is currently bound to, derived from the URL
 * ("/editor/$planId" → id), or null for a new/unsaved plan ("/editor"). Read on
 * demand (e.g. at Cloud Save time) rather than reactively.
 */
export function getCurrentPlanId(): number | null {
  const params = router.state.matches.at(-1)?.params as { planId?: string } | undefined;
  const id = params?.planId ? Number(params.planId) : NaN;
  return Number.isFinite(id) ? id : null;
}
