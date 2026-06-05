// Unit 10 — Toolbar tests. Renders the vertical tool strip against the sample
// scene and verifies mode switching, active-state, snap toggles, and undo state.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toolbar } from './Toolbar';
import { usePlannerStore } from '../store';
import { TOOLS } from '../tools/registry';
import { makeSampleScene } from '../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().setMode('idle');
  cleanup();
});

describe('Toolbar', () => {
  it('renders a button for every registered tool', () => {
    render(<Toolbar />);
    for (const tool of TOOLS) {
      expect(screen.getByRole('button', { name: tool.label })).toBeInTheDocument();
    }
  });

  it('switches mode when a tool button is clicked', () => {
    render(<Toolbar />);
    // Find a tool that isn't the current (idle) mode.
    const tool = TOOLS.find((t) => t.mode !== 'idle');
    expect(tool).toBeDefined();
    const btn = screen.getByRole('button', { name: tool!.label });
    fireEvent.click(btn);
    expect(usePlannerStore.getState().mode).toBe(tool!.mode);
  });

  it('marks the active tool button with aria-pressed=true', () => {
    const tool = TOOLS.find((t) => t.mode !== 'idle')!;
    usePlannerStore.getState().setMode(tool.mode);
    render(<Toolbar />);
    const btn = screen.getByRole('button', { name: tool.label });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    // Other tool buttons are not pressed.
    for (const other of TOOLS) {
      if (other.id === tool.id) continue;
      expect(screen.getByRole('button', { name: other.label })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
  });

  it('exposes shortcut in the tooltip title', () => {
    render(<Toolbar />);
    const tool = TOOLS.find((t) => t.shortcut)!;
    const btn = screen.getByRole('button', { name: tool.label });
    expect(btn).toHaveAttribute(
      'title',
      `${tool.label} (${tool.shortcut!.toUpperCase()})`,
    );
  });

  it('flips the grid snap flag when its toggle is clicked', () => {
    render(<Toolbar />);
    const before = usePlannerStore.getState().snapMask.grid;
    fireEvent.click(screen.getByRole('button', { name: 'Snap to grid' }));
    expect(usePlannerStore.getState().snapMask.grid).toBe(!before);
  });

  it('flips the vertex snap flag when its toggle is clicked', () => {
    render(<Toolbar />);
    const before = usePlannerStore.getState().snapMask.vertex;
    fireEvent.click(screen.getByRole('button', { name: 'Snap to vertices' }));
    expect(usePlannerStore.getState().snapMask.vertex).toBe(!before);
  });

  it('flips the line snap flag when its toggle is clicked', () => {
    render(<Toolbar />);
    const before = usePlannerStore.getState().snapMask.line;
    fireEvent.click(screen.getByRole('button', { name: 'Snap to lines' }));
    expect(usePlannerStore.getState().snapMask.line).toBe(!before);
  });

  it('reflects snap state via aria-pressed', () => {
    usePlannerStore.setState({
      snapMask: { grid: true, vertex: false, line: false, guide: true },
    });
    render(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Snap to grid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Snap to vertices' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables Undo with empty history and enables it after a mutation', () => {
    const { rerender } = render(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

    usePlannerStore.getState().renameProject('x');
    rerender(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('disables Redo until an undo is performed', () => {
    usePlannerStore.getState().renameProject('x');
    const { rerender } = render(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

    usePlannerStore.getState().undo();
    rerender(<Toolbar />);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });
});
