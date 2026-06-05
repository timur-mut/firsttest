// App-level navigation (separate from the planner scene store): which screen is
// shown, and which saved plan (if any) the editor is currently bound to.
import { create } from 'zustand';

interface AppState {
  view: 'editor' | 'plans';
  /** Id of the saved plan the editor is bound to (null = unsaved / new). */
  currentPlanId: number | null;
  showPlans(): void;
  showEditor(): void;
  setCurrentPlan(id: number | null): void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'editor',
  currentPlanId: null,
  showPlans: () => set({ view: 'plans' }),
  showEditor: () => set({ view: 'editor' }),
  setCurrentPlan: (id) => set({ currentPlanId: id }),
}));
