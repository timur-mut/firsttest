import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogSidebar } from './CatalogSidebar';
import { CATALOG } from './data';
import { ITEM_DRAG_MIME } from '@/planner/contract/catalogTypes';

describe('CatalogSidebar', () => {
  it('renders tiles for every catalog item', () => {
    render(<CatalogSidebar />);
    for (const proto of CATALOG) {
      expect(screen.getByText(proto.name)).toBeInTheDocument();
    }
  });

  it('filters tiles by the search query (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<CatalogSidebar />);

    const search = screen.getByLabelText('Search furniture');
    await user.type(search, 'sofa');

    expect(screen.getByText('Sofa')).toBeInTheDocument();
    // A non-matching item is filtered out.
    expect(screen.queryByText('Toilet')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CatalogSidebar />);

    const search = screen.getByLabelText('Search furniture');
    await user.type(search, 'zzzznomatch');

    expect(screen.queryByText('Sofa')).not.toBeInTheDocument();
    expect(screen.getByText(/No items match/i)).toBeInTheDocument();
  });

  it('renders draggable tiles that set the drag payload on dragStart', () => {
    render(<CatalogSidebar />);

    const tile = screen.getByText('Sofa').closest('button');
    expect(tile).not.toBeNull();
    expect(tile).toHaveAttribute('draggable', 'true');

    // Mock DataTransfer (jsdom's drag events don't provide a real one).
    const store: Record<string, string> = {};
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn((type: string, value: string) => {
        store[type] = value;
      }),
      getData: (type: string) => store[type] ?? '',
    };

    fireEvent.dragStart(tile!, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      ITEM_DRAG_MIME,
      expect.any(String),
    );
    expect(dataTransfer.effectAllowed).toBe('copy');

    const payload = JSON.parse(store[ITEM_DRAG_MIME]);
    expect(payload).toMatchObject({
      type: 'sofa',
      defaultWidth: 200,
      defaultDepth: 90,
    });
    expect(typeof payload.color).toBe('string');
  });

  it('groups tiles under category headings', () => {
    render(<CatalogSidebar />);
    const seating = screen.getByRole('heading', { name: /seating/i });
    const section = seating.closest('section');
    expect(section).not.toBeNull();
    expect(within(section!).getByText('Sofa')).toBeInTheDocument();
  });
});
