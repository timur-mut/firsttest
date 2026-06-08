import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deletePlanFromServer,
  listPlans,
  loadPlanFromServer,
  savePlanToServer,
  updatePlanOnServer,
} from './api';
import { makeSampleScene } from '../__fixtures__/sampleScene';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

function res(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('plans API client', () => {
  it('listPlans GETs /api/plans', async () => {
    fetchMock.mockResolvedValue(res([{ id: 1, name: 'A', createdAt: 'x', updatedAt: 'y' }]));
    const plans = await listPlans();
    expect(fetchMock).toHaveBeenCalledWith('/api/plans');
    expect(plans).toHaveLength(1);
  });

  it('savePlanToServer POSTs {name, serialized scene} and returns a summary (no scene)', async () => {
    fetchMock.mockResolvedValue(res({ id: 7, name: 'My', scene: '{}', createdAt: 'a', updatedAt: 'b' }, true, 201));
    const summary = await savePlanToServer('My', makeSampleScene());

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/plans');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string) as { name: string; scene: string };
    expect(body.name).toBe('My');
    // scene is the serialized envelope (a JSON string), not a nested object.
    expect(typeof body.scene).toBe('string');
    expect(JSON.parse(body.scene).scene.name).toBe('Sample Plan');

    expect(summary).toMatchObject({ id: 7, name: 'My' });
    expect('scene' in summary).toBe(false);
    // No reference image passed → referenceImage is null in the body.
    expect(body).toHaveProperty('referenceImage', null);
  });

  it('savePlanToServer sends the reference image as a JSON string', async () => {
    fetchMock.mockResolvedValue(res({ id: 8, name: 'My', scene: '{}', createdAt: 'a', updatedAt: 'b' }, true, 201));
    const refImage = {
      src: 'data:image/png;base64,AAA',
      naturalWidth: 800,
      naturalHeight: 600,
      x: 10,
      y: 20,
      scale: 1,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      locked: false,
    };
    await savePlanToServer('My', makeSampleScene(), refImage);
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { referenceImage: string };
    expect(typeof body.referenceImage).toBe('string');
    expect(JSON.parse(body.referenceImage)).toMatchObject({ src: 'data:image/png;base64,AAA', x: 10 });
  });

  it('updatePlanOnServer PUTs /api/plans/{id}', async () => {
    fetchMock.mockResolvedValue(res({ id: 5, name: 'N', scene: '{}', createdAt: 'a', updatedAt: 'b' }));
    await updatePlanOnServer(5, 'N', makeSampleScene());
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/plans/5');
    expect(opts.method).toBe('PUT');
  });

  it('loadPlanFromServer parses the scene envelope and a null reference image', async () => {
    const envelope = JSON.stringify({ version: 1, scene: makeSampleScene() });
    fetchMock.mockResolvedValue(res({ id: 3, name: 'X', scene: envelope, createdAt: 'a', updatedAt: 'b' }));
    const { scene, referenceImage } = await loadPlanFromServer(3);
    expect(fetchMock).toHaveBeenCalledWith('/api/plans/3');
    expect(scene.name).toBe('Sample Plan');
    expect(Object.keys(scene.layers)).toHaveLength(1);
    expect(referenceImage).toBeNull();
  });

  it('loadPlanFromServer parses the reference image JSON string', async () => {
    const envelope = JSON.stringify({ version: 1, scene: makeSampleScene() });
    const refImage = JSON.stringify({ src: 'data:image/png;base64,AAA', naturalWidth: 800, naturalHeight: 600, x: 5, y: 6, scale: 1, rotation: 0, opacity: 0.5, visible: true, locked: false });
    fetchMock.mockResolvedValue(
      res({ id: 3, name: 'X', scene: envelope, referenceImage: refImage, createdAt: 'a', updatedAt: 'b' }),
    );
    const { referenceImage } = await loadPlanFromServer(3);
    expect(referenceImage).toMatchObject({ src: 'data:image/png;base64,AAA', x: 5, naturalWidth: 800 });
  });

  it('deletePlanFromServer DELETEs and tolerates a 404', async () => {
    fetchMock.mockResolvedValue(res(null, false, 404));
    await expect(deletePlanFromServer(9)).resolves.toBeUndefined();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/plans/9');
    expect(opts.method).toBe('DELETE');
  });

  it('throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue(res(null, false, 500));
    await expect(listPlans()).rejects.toThrow(/500/);
  });
});
