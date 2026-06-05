import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

beforeEach(() => useAppStore.setState({ view: 'editor', currentPlanId: null }));

describe('useAppStore', () => {
  it('navigates between editor and plans, and tracks the current plan', () => {
    expect(useAppStore.getState().view).toBe('editor');
    useAppStore.getState().showPlans();
    expect(useAppStore.getState().view).toBe('plans');
    useAppStore.getState().showEditor();
    expect(useAppStore.getState().view).toBe('editor');

    useAppStore.getState().setCurrentPlan(42);
    expect(useAppStore.getState().currentPlanId).toBe(42);
    useAppStore.getState().setCurrentPlan(null);
    expect(useAppStore.getState().currentPlanId).toBeNull();
  });
});
