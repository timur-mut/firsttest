import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferenceImagePanel } from './ReferenceImagePanel';
import { useReferenceImageStore } from '../store/referenceImageStore';

// Minimal FileReader/Image mocks so upload resolves deterministically (and the
// natural size stays under the downscale cap so the canvas path is skipped).
class FileReaderMock {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    this.result = 'data:image/png;base64,AAA';
    this.onload?.();
  }
}
class ImageMock {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  set src(_v: string) {
    this.onload?.();
  }
}

beforeEach(() => {
  useReferenceImageStore.getState().clear();
  vi.stubGlobal('FileReader', FileReaderMock);
  vi.stubGlobal('Image', ImageMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('ReferenceImagePanel', () => {
  it('uploads an image into the store', async () => {
    render(<ReferenceImagePanel />);
    const input = screen.getByLabelText('Upload reference image');
    const file = new File(['x'], 'plan.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(useReferenceImageStore.getState().src).toBe('data:image/png;base64,AAA'));
    expect(useReferenceImageStore.getState().naturalWidth).toBe(800);
  });

  it('changes opacity via the slider', () => {
    useReferenceImageStore.getState().setImage('data:img', 800, 600);
    render(<ReferenceImagePanel />);
    fireEvent.change(screen.getByLabelText('Reference image opacity'), { target: { value: '0.2' } });
    expect(useReferenceImageStore.getState().opacity).toBeCloseTo(0.2);
  });

  it('toggles lock and visibility', () => {
    useReferenceImageStore.getState().setImage('data:img', 800, 600);
    render(<ReferenceImagePanel />);
    fireEvent.click(screen.getByLabelText('Lock reference image'));
    expect(useReferenceImageStore.getState().locked).toBe(true);
    fireEvent.click(screen.getByLabelText('Show reference image'));
    expect(useReferenceImageStore.getState().visible).toBe(false);
  });

  it('removes the image after confirm', () => {
    useReferenceImageStore.getState().setImage('data:img', 800, 600);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ReferenceImagePanel />);
    fireEvent.click(screen.getByLabelText('Remove reference image'));
    expect(useReferenceImageStore.getState().src).toBeNull();
    confirmSpy.mockRestore();
  });
});
