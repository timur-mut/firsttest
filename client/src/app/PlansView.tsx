// Plans list view — browse, open, delete, and start saved plans from the DB.
// This is the app's home route ("/"); opening a plan navigates to
// "/editor/$planId" (the route loader fetches and loads the scene).
import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { router } from './router';
import { usePlannerStore } from '@/planner/store';
import { useReferenceImageStore } from '@/planner/store/referenceImageStore';
import { deletePlanFromServer, listPlans, type PlanSummary } from '@/planner/persistence/api';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'ready' | 'error';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function PlansView() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setPlans(await listPlans());
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Navigate to the plan's URL; the "/editor/$planId" route loader fetches and
  // loads the scene (and surfaces load failures via its error component).
  function openPlan(id: number) {
    void router.navigate({ to: '/editor/$planId', params: { planId: String(id) } });
  }

  function newPlan() {
    usePlannerStore.getState().resetScene();
    useReferenceImageStore.getState().clear();
    void router.navigate({ to: '/editor' });
  }

  async function removePlan(id: number) {
    if (!window.confirm('Delete this plan? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await deletePlanFromServer(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete plan');
      setStatus('error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
        <span className="font-semibold">My plans</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onClick={newPlan}>
            <Plus className="size-4" /> New plan
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        )}

        {status === 'error' && (
          <div className="mx-auto max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
            <p className="text-sm font-medium text-destructive">Couldn’t load plans</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Is the API running? Plans are stored in the database.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </div>
        )}

        {status === 'ready' && plans.length === 0 && (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <FileText className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No saved plans yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a plan, then use “Save to cloud” in the editor.
            </p>
            <Button size="sm" className="mt-4" onClick={newPlan}>
              <Plus className="size-4" /> New plan
            </Button>
          </div>
        )}

        {status === 'ready' && plans.length > 0 && (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {plans.map((plan) => (
              <li
                key={plan.id}
                data-plan-id={plan.id}
                className="group flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    aria-label={`Delete ${plan.name}`}
                    disabled={busyId === plan.id}
                    onClick={() => void removePlan(plan.id)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium" title={plan.name}>
                    {plan.name || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">Updated {formatWhen(plan.updatedAt)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  disabled={busyId === plan.id}
                  onClick={() => openPlan(plan.id)}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
