// Properties panel — owned by Unit 7 (Selection + properties).
// Switches on the active selection bucket and renders editors for the selected
// element, plus a Delete action. Depends only on the contract + store; editing
// goes through the owning slices' actions (updateItem/rotateItem, updateHole,
// setAreaColor). Walls have no prop setter, so they show read-only info.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '../store';
import { getSelectedLayer } from '../store/helpers';
import { verticesDistance } from '../contract/geometry';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="w-28">{children}</div>
    </label>
  );
}

function NumberInput({
  value,
  onCommit,
  min,
  step = 1,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <Input
      type="number"
      className="h-8"
      value={Number.isFinite(value) ? value : ''}
      min={min}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onCommit(n);
      }}
    />
  );
}

export function PropertiesPanel() {
  const selected = usePlannerStore((s) => s.selected);
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const store = usePlannerStore;

  const count =
    selected.vertices.length +
    selected.lines.length +
    selected.holes.length +
    selected.items.length +
    selected.areas.length;

  // Resolve the single "primary" selected element per non-empty bucket.
  const item = selected.items.length ? layer.items[selected.items[0]] : undefined;
  const hole = selected.holes.length ? layer.holes[selected.holes[0]] : undefined;
  const line = selected.lines.length ? layer.lines[selected.lines[0]] : undefined;
  const area = selected.areas.length ? layer.areas[selected.areas[0]] : undefined;
  const vertex = selected.vertices.length ? layer.vertices[selected.vertices[0]] : undefined;

  const hasDeletable = Boolean(item || hole || line || area);
  const deleteSelected = () => store.getState().deleteSelected();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-3 py-2 text-sm font-medium">Properties</div>

      {count === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
          Nothing selected
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          {item && (
            <section className="flex flex-col gap-2" data-section="item">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Furniture
              </h3>
              <Field label="Width">
                <NumberInput
                  value={item.width}
                  min={1}
                  onCommit={(n) => store.getState().updateItem(item.id, { width: n })}
                />
              </Field>
              <Field label="Depth">
                <NumberInput
                  value={item.depth}
                  min={1}
                  onCommit={(n) => store.getState().updateItem(item.id, { depth: n })}
                />
              </Field>
              <Field label="Rotation">
                <NumberInput
                  value={item.rotation}
                  step={5}
                  onCommit={(n) => store.getState().rotateItem(item.id, n)}
                />
              </Field>
              <Field label="Color">
                <Input
                  type="color"
                  className="h-8 w-full p-1"
                  value={(item.properties.color as string | undefined) ?? '#94a3b8'}
                  onChange={(e) =>
                    store.getState().updateItem(item.id, {
                      properties: { ...item.properties, color: e.target.value },
                    })
                  }
                />
              </Field>
            </section>
          )}

          {hole && (
            <section className="flex flex-col gap-2" data-section="hole">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {hole.type === 'door' ? 'Door' : 'Window'}
              </h3>
              <Field label="Width">
                <NumberInput
                  value={hole.width}
                  min={1}
                  onCommit={(n) => store.getState().updateHole(hole.id, { width: n })}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={hole.height}
                  min={1}
                  onCommit={(n) => store.getState().updateHole(hole.id, { height: n })}
                />
              </Field>
              <Field label="Altitude">
                <NumberInput
                  value={hole.altitude}
                  min={0}
                  onCommit={(n) => store.getState().updateHole(hole.id, { altitude: n })}
                />
              </Field>
            </section>
          )}

          {line && (
            <section className="flex flex-col gap-2" data-section="line">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Wall
              </h3>
              {(() => {
                const a = layer.vertices[line.vertices[0]];
                const b = layer.vertices[line.vertices[1]];
                const length = a && b ? verticesDistance(a, b) : 0;
                return (
                  <>
                    <Field label="Length">
                      <span className="block text-right text-xs tabular-nums">
                        {length.toFixed(1)}
                      </span>
                    </Field>
                    <Field label="Thickness">
                      <span className="block text-right text-xs tabular-nums">
                        {line.thickness}
                      </span>
                    </Field>
                    <Field label="Height">
                      <span className="block text-right text-xs tabular-nums">
                        {line.height}
                      </span>
                    </Field>
                  </>
                );
              })()}
            </section>
          )}

          {area && (
            <section className="flex flex-col gap-2" data-section="area">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Room
              </h3>
              <Field label="Color">
                <Input
                  type="color"
                  className="h-8 w-full p-1"
                  value={area.color}
                  onChange={(e) => store.getState().setAreaColor(area.id, e.target.value)}
                />
              </Field>
            </section>
          )}

          {vertex && (
            <section className="flex flex-col gap-2" data-section="vertex">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Corner
              </h3>
              <Field label="X">
                <NumberInput
                  value={vertex.x}
                  onCommit={(n) => store.getState().moveVertex(vertex.id, n, vertex.y)}
                />
              </Field>
              <Field label="Y">
                <NumberInput
                  value={vertex.y}
                  onCommit={(n) => store.getState().moveVertex(vertex.id, vertex.x, n)}
                />
              </Field>
            </section>
          )}

          {hasDeletable && (
            <div className="mt-auto pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={deleteSelected}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
