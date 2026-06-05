// Plans list view — browse, open, delete, and start saved plans from the DB.
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAppStore } from './appStore';
import { usePlannerStore } from '@/planner/store';
import {
  deletePlanFromServer,
  listPlans,
  loadPlanFromServer,
  type PlanSummary,
} from '@/planner/persistence/api';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'ready' | 'error';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function PlansView() {
  const showEditor = useAppStore((s) => s.showEditor);
  const setCurrentPlan = useAppStore((s) => s.setCurrentPlan);

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

  async function openPlan(id: number) {
    setBusyId(id);
    try {
      const scene = await loadPlanFromServer(id);
      usePlannerStore.getState().setScene(scene);
      setCurrentPlan(id);
      showEditor();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open plan');
      setStatus('error');
    } finally {
      setBusyId(null);
    }
  }

  function newPlan() {
    usePlannerStore.getState().resetScene();
    setCurrentPlan(null);
    showEditor();
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
        <Button variant="ghost" size="sm" onClick={showEditor} aria-label="Back to editor">
          <ArrowLeft className="size-4" /> Editor
        </Button>
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
                  onClick={() => void openPlan(plan.id)}
                >
                  {busyId === plan.id ? 'Opening…' : 'Open'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
