// Unit 11 — TopBar tests. Cover the project-name editing flow, the File
// actions (Save downloads a JSON file, Open loads one), the New action, and
// zoom controls.

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { exportToFile, importFromFile } from '../persistence/storage';

// Save/Open are file-based; stub the file I/O so we can assert the wiring
// without touching the real download / FileReader machinery.
vi.mock('../persistence/storage', () => ({
  exportToFile: vi.fn(),
  importFromFile: vi.fn(),
}));

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  vi.clearAllMocks();
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

  it('Save downloads the current scene as a JSON file', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(exportToFile).toHaveBeenCalledTimes(1);
    expect((exportToFile as Mock).mock.calls[0][0].name).toBe('Sample Plan');
  });

  it('Open loads a scene from the chosen JSON file', async () => {
    const imported = makeSampleScene();
    imported.name = 'Imported';
    (importFromFile as Mock).mockResolvedValue(imported);

    const user = userEvent.setup();
    const { container } = render(<TopBar />);

    // Open triggers the hidden file input; simulate the user picking a file.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'plan.json', { type: 'application/json' });
    await user.upload(input, file);

    expect(importFromFile).toHaveBeenCalledWith(file);
    await waitFor(() => expect(usePlannerStore.getState().scene.name).toBe('Imported'));
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
