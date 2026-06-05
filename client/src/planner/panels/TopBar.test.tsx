// Unit 11 — TopBar tests. Cover the project-name editing flow, the File
// Save→Open round-trip via localStorage, the New action, and zoom controls.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  localStorage.clear();
});

describe('TopBar', () => {
  it('renders the project name', () => {
    render(<TopBar />);
    expect(screen.getByText('Sample Plan')).toBeTruthy();
  });

  it('renames the project: click → type → Enter', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    await user.click(screen.getByText('Sample Plan'));
    const input = screen.getByLabelText('Project name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'My House{Enter}');

    expect(usePlannerStore.getState().scene.name).toBe('My House');
    // The committed name is shown again (no longer in edit mode).
    expect(screen.getByText('My House')).toBeTruthy();
  });

  it('cancels rename on Escape without mutating the store', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    await user.click(screen.getByText('Sample Plan'));
    const input = screen.getByLabelText('Project name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Discarded{Escape}');

    expect(usePlannerStore.getState().scene.name).toBe('Sample Plan');
  });

  it('round-trips through localStorage via Save then Open', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    // Save the current (sample) scene.
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Mutate after saving.
    usePlannerStore.getState().renameProject('Mutated');
    expect(usePlannerStore.getState().scene.name).toBe('Mutated');

    // Open restores the saved snapshot.
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(usePlannerStore.getState().scene.name).toBe('Sample Plan');
  });

  it('starts a blank project when New is confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TopBar />);

    await user.click(screen.getByRole('button', { name: 'New' }));

    expect(confirmSpy).toHaveBeenCalled();
    // resetScene() produces a blank scene with no wall layer geometry.
    const scene = usePlannerStore.getState().scene;
    expect(scene.name).not.toBe('Sample Plan');
    confirmSpy.mockRestore();
  });

  it('zoom-in increases the store zoom', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    const before = usePlannerStore.getState().zoom;
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(usePlannerStore.getState().zoom).toBeGreaterThan(before);
  });

  it('reset-zoom readout resets the view', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    usePlannerStore.getState().setZoom(2);
    await user.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(usePlannerStore.getState().zoom).toBe(1);
  });
});
