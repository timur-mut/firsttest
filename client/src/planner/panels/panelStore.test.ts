import { describe, it, expect, beforeEach } from 'vitest';
import { usePanelStore } from './panelStore';

beforeEach(() => usePanelStore.setState({ catalogOpen: true, propertiesOpen: true }));

describe('usePanelStore', () => {
  it('toggles each panel independently', () => {
    usePanelStore.getState().toggleCatalog();
    expect(usePanelStore.getState().catalogOpen).toBe(false);
    expect(usePanelStore.getState().propertiesOpen).toBe(true);

    usePanelStore.getState().toggleProperties();
    expect(usePanelStore.getState().propertiesOpen).toBe(false);

    usePanelStore.getState().toggleCatalog();
    expect(usePanelStore.getState().catalogOpen).toBe(true);
  });

  it('sets panel visibility explicitly', () => {
    usePanelStore.getState().setCatalog(false);
    usePanelStore.getState().setProperties(false);
    expect(usePanelStore.getState().catalogOpen).toBe(false);
    expect(usePanelStore.getState().propertiesOpen).toBe(false);
  });

  it('closeAll collapses both panels', () => {
    usePanelStore.getState().closeAll();
    expect(usePanelStore.getState().catalogOpen).toBe(false);
    expect(usePanelStore.getState().propertiesOpen).toBe(false);
  });
});
