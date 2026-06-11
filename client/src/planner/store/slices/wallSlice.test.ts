// Unit 2 — wall slice tests. Exercises chain drawing, vertex merging, vertex
// moves, line removal (with orphan + hole cleanup), and per-operation undo.

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';
import { detectRoomCycles } from '@/planner/utils/areaDetection';

function store() {
  return usePlannerStore.getState();
}

function layer() {
  const s = store().scene;
  return s.layers[s.selectedLayer];
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('wall drawing chain', () => {
  it('creates vertices + lines with correct back-references', () => {
    const before = Object.keys(layer().vertices).length;

    store().beginWall(1000, 1000);
    store().addWallPoint(1200, 1000);
    store().addWallPoint(1200, 1200);
    store().finishWall();

    const l = layer();
    // 3 new vertices, 2 new lines.
    expect(Object.keys(l.vertices).length).toBe(before + 3);

    const newLines = Object.values(l.lines).filter((ln) =>
      ln.vertices.every((vId) => {
        const v = l.vertices[vId];
        return v.x >= 1000 && v.y >= 1000;
      }),
    );
    expect(newLines.length).toBe(2);

    // Each line is back-referenced by both of its endpoint vertices.
    for (const ln of newLines) {
      for (const vId of ln.vertices) {
        expect(l.vertices[vId].lines).toContain(ln.id);
      }
    }

    // The middle vertex of the chain touches both new lines.
    const mid = Object.values(l.vertices).find((v) => v.x === 1200 && v.y === 1000);
    expect(mid).toBeDefined();
    expect(mid!.lines.length).toBe(2);
  });

  it('merges onto a coincident existing vertex instead of duplicating', () => {
    const before = Object.keys(layer().vertices).length;

    // v1 in the fixture is at (100,100). Draw a chain that ends on it.
    store().beginWall(1000, 1000);
    store().addWallPoint(100, 100); // coincident with fixture vertex v1
    store().finishWall();

    const l = layer();
    // Only the start vertex is new; the endpoint reused v1.
    expect(Object.keys(l.vertices).length).toBe(before + 1);

    const v1 = l.vertices['v1'];
    expect(v1).toBeDefined();
    // v1 gained exactly one new line (it originally had 2).
    expect(v1.lines.length).toBe(3);

    // The new line references v1 as an endpoint.
    const merged = Object.values(l.lines).find(
      (ln) => ln.vertices.includes('v1') && ln.vertices.some((id) => id !== 'v1' && l.vertices[id]?.x === 1000),
    );
    expect(merged).toBeDefined();
  });

  it('cancelWall discards the draft and prunes the orphaned start vertex', () => {
    const before = Object.keys(layer().vertices).length;
    store().beginWall(1000, 1000);
    store().updateWallDraft(1300, 1000);
    expect(Object.keys(layer().vertices).length).toBe(before + 1);

    store().cancelWall();
    expect(store().wallDraft).toBeNull();
    // The lone start vertex (no attached lines) is removed.
    expect(Object.keys(layer().vertices).length).toBe(before);
  });

  it('cancelWall keeps committed segments but prunes only orphans', () => {
    const before = Object.keys(layer().vertices).length;
    store().beginWall(1000, 1000);
    store().addWallPoint(1200, 1000); // commit one segment
    store().cancelWall();
    // Both endpoints of the committed wall survive.
    expect(Object.keys(layer().vertices).length).toBe(before + 2);
  });

  it('finishWall prunes a start-only chain with no committed segment', () => {
    const before = Object.keys(layer().vertices).length;
    store().beginWall(1000, 1000);
    store().finishWall();
    expect(Object.keys(layer().vertices).length).toBe(before);
  });
});

describe('wall split-and-join (T-junctions)', () => {
  it('splits the walls a partition lands on and divides the room in two', () => {
    // The sample scene has two rooms split by l-mid. The left room is bounded by
    // the top wall (l-top-left, y=100) and bottom wall (l-bottom-left, y=400).
    expect(detectRoomCycles(layer()).length).toBe(2);
    const linesBefore = Object.keys(layer().lines).length;

    // Draw a partition straight across the left room, endpoints landing ON the
    // top and bottom walls (as line-snapping would produce).
    store().beginWall(300, 100); // on l-top-left
    store().addWallPoint(300, 400); // on l-bottom-left
    store().finishWall();

    const l = layer();
    // Each touched wall is split in two, plus the partition itself: +3 lines.
    expect(Object.keys(l.lines).length).toBe(linesBefore + 3);

    // A junction vertex now sits on each wall, wired into three walls.
    const topJoint = Object.values(l.vertices).find((v) => v.x === 300 && v.y === 100);
    const bottomJoint = Object.values(l.vertices).find((v) => v.x === 300 && v.y === 400);
    expect(topJoint?.lines.length).toBe(3);
    expect(bottomJoint?.lines.length).toBe(3);

    // The left room is now divided into two rooms (3 total with the right room).
    expect(detectRoomCycles(l).length).toBe(3);
  });

  it('leaves a wall ending in open space as a free, non-closing wall', () => {
    const linesBefore = Object.keys(layer().lines).length;

    // Both endpoints are far from any existing wall — nothing to split.
    store().beginWall(1400, 1400);
    store().addWallPoint(1700, 1400);
    store().finishWall();

    const l = layer();
    expect(Object.keys(l.lines).length).toBe(linesBefore + 1);
    // The free end is a lone, non-closing wall (degree-1 endpoints).
    const end = Object.values(l.vertices).find((v) => v.x === 1700 && v.y === 1400);
    expect(end?.lines.length).toBe(1);
    // No new room was formed.
    expect(detectRoomCycles(l).length).toBe(2);
  });
});

describe('moveVertex', () => {
  it('relocates a vertex and keeps its wall attachments', () => {
    const v2 = layer().vertices['v2'];
    const attached = [...v2.lines];

    store().moveVertex('v2', 520, 130);

    const moved = layer().vertices['v2'];
    expect(moved.x).toBe(520);
    expect(moved.y).toBe(130);
    // Attachments are unchanged.
    expect(moved.lines).toEqual(attached);
    // Lines still reference v2.
    for (const lineId of attached) {
      expect(layer().lines[lineId].vertices).toContain('v2');
    }
  });
});

describe('removeLine', () => {
  it('removes the wall, cleans orphaned vertices, and drops its holes', () => {
    // l-mid connects v2 and v5, both shared with other walls — no orphans.
    store().removeLine('l-mid');
    expect(layer().lines['l-mid']).toBeUndefined();
    expect(layer().vertices['v2']).toBeDefined();
    expect(layer().vertices['v2'].lines).not.toContain('l-mid');
    expect(layer().vertices['v5'].lines).not.toContain('l-mid');
  });

  it('deletes orphaned vertices and the wall holes', () => {
    // Draw an isolated wall, then remove it — both endpoints orphan.
    store().beginWall(1500, 1500);
    store().addWallPoint(1700, 1500);
    store().finishWall();

    const isolated = Object.values(layer().lines).find(
      (ln) => layer().vertices[ln.vertices[0]]?.x === 1500,
    )!;
    const [a, b] = isolated.vertices;

    store().removeLine(isolated.id);

    expect(layer().lines[isolated.id]).toBeUndefined();
    expect(layer().vertices[a]).toBeUndefined();
    expect(layer().vertices[b]).toBeUndefined();
  });

  it('drops the holes carried by the removed wall', () => {
    // l-left carries h-door in the fixture; removing it deletes the hole.
    expect(layer().holes['h-door']).toBeDefined();
    store().removeLine('l-left');
    expect(layer().lines['l-left']).toBeUndefined();
    expect(layer().holes['h-door']).toBeUndefined();
  });
});

describe('undo per operation', () => {
  it('each committed operation creates exactly one undo step', () => {
    expect(store().history.past.length).toBe(0);

    store().beginWall(1000, 1000);
    expect(store().history.past.length).toBe(1);

    store().addWallPoint(1200, 1000);
    expect(store().history.past.length).toBe(2);

    // undo reverts the last addWallPoint (the second segment vertex/line).
    const verticesAfterAdd = Object.keys(layer().vertices).length;
    store().undo();
    expect(Object.keys(layer().vertices).length).toBe(verticesAfterAdd - 1);
  });

  it('undo reverts moveVertex', () => {
    const original = { ...layer().vertices['v2'] };
    store().moveVertex('v2', 520, 130);
    expect(layer().vertices['v2'].x).toBe(520);
    store().undo();
    expect(layer().vertices['v2'].x).toBe(original.x);
    expect(layer().vertices['v2'].y).toBe(original.y);
  });

  it('undo reverts removeLine', () => {
    store().removeLine('l-mid');
    expect(layer().lines['l-mid']).toBeUndefined();
    store().undo();
    expect(layer().lines['l-mid']).toBeDefined();
    expect(layer().vertices['v2'].lines).toContain('l-mid');
  });
});
