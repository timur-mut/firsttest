// Properties panel — owned by Unit 7 (Selection + properties).
// Switches on the active selection bucket and renders editors for the selected
// element, plus a Delete action. Depends only on the contract + store; editing
// goes through the owning slices' actions (updateItem/rotateItem, updateHole,
// setAreaColor). Walls have no prop setter, so they show read-only info.

import { useMemo } from 'react';
import { PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '../store';
import { getSelectedLayer } from '../store/helpers';
import { verticesDistance } from '../contract/geometry';
import { detectAreas } from '../utils/areaDetection';
import type { Flooring, FlooringType } from '../flooring/types';
import {
  FLOORING_ORDER,
  FLOORING_SPECS,
  PATTERN_LABELS,
  makeFlooring,
  type FlooringElement,
} from '../flooring/catalog';

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

/** Compact native <select>, styled to match the panel's inputs. */
function SelectInput({
  value,
  onChange,
  children,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-8 w-full rounded-md border bg-transparent px-2 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

/** Noun used for an element's dimensions in the panel (e.g. "Plank width"). */
function elementNoun(element: FlooringElement): string {
  switch (element) {
    case 'plank':
      return 'Plank';
    case 'sheet':
      return 'Sheet';
    case 'seamless':
      return 'Surface';
    case 'tile':
    default:
      return 'Tile';
  }
}

/** Text input that commits on blur / Enter (one undo step, not per keystroke). */
function TextCommitInput({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (s: string) => void;
}) {
  return (
    <Input
      className="h-8"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export function PropertiesPanel({ onClose }: { onClose?: () => void } = {}) {
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
  // Rooms are derived; resolve the selected one from detection (the store's
  // layer.areas only holds name/colour overrides), recomputing on edits.
  const detectedAreas = useMemo(
    () => detectAreas(layer),
    [layer.vertices, layer.lines, layer.areas],
  );
  const area = selected.areas.length ? detectedAreas[selected.areas[0]] : undefined;
  const vertex = selected.vertices.length ? layer.vertices[selected.vertices[0]] : undefined;

  const hasDeletable = Boolean(item || hole || line || area);
  const deleteSelected = () => store.getState().deleteSelected();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">Properties</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse properties panel"
            title="Collapse properties"
            className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="size-4" />
          </button>
        )}
      </div>

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
              {hole.type === 'door' && (
                <Field label="Orientation">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 px-2"
                      aria-label="Flip door hinge"
                      title="Flip hinge side"
                      onClick={() => store.getState().updateHole(hole.id, { flipX: !hole.flipX })}
                    >
                      Hinge
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 px-2"
                      aria-label="Flip door swing"
                      title="Flip swing side"
                      onClick={() => store.getState().updateHole(hole.id, { flipY: !hole.flipY })}
                    >
                      Swing
                    </Button>
                  </div>
                </Field>
              )}
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
                      <NumberInput
                        value={line.thickness}
                        min={1}
                        onCommit={(n) => store.getState().setLineThickness(line.id, n)}
                      />
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
              <Field label="Name">
                <TextCommitInput
                  key={area.id}
                  value={area.name ?? ''}
                  placeholder="Room"
                  onCommit={(name) => store.getState().setAreaName(area.id, name)}
                />
              </Field>
              <Field label="Color">
                <Input
                  type="color"
                  className="h-8 w-full p-1"
                  value={area.color}
                  onChange={(e) => store.getState().setAreaColor(area.id, e.target.value)}
                />
              </Field>

              <Field label="Flooring">
                <SelectInput
                  aria-label="Flooring type"
                  value={area.flooring?.type ?? ''}
                  onChange={(value) =>
                    store
                      .getState()
                      .setAreaFlooring(
                        area.id,
                        value === '' ? undefined : makeFlooring(value as FlooringType),
                      )
                  }
                >
                  <option value="">None</option>
                  {FLOORING_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {FLOORING_SPECS[type].label}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {area.flooring &&
                (() => {
                  const f: Flooring = area.flooring;
                  const spec = FLOORING_SPECS[f.type];
                  const noun = elementNoun(spec.element);
                  const update = (patch: Partial<Flooring>) =>
                    store.getState().setAreaFlooring(area.id, { ...f, ...patch });
                  const showSeams = f.pattern !== 'solid';
                  return (
                    <>
                      {spec.patterns.length > 1 && (
                        <Field label="Pattern">
                          <SelectInput
                            aria-label="Flooring pattern"
                            value={f.pattern}
                            onChange={(value) =>
                              update({ pattern: value as Flooring['pattern'] })
                            }
                          >
                            {spec.patterns.map((p) => (
                              <option key={p} value={p}>
                                {PATTERN_LABELS[p]}
                              </option>
                            ))}
                          </SelectInput>
                        </Field>
                      )}
                      {showSeams && (
                        <>
                          <Field label={`${noun} width`}>
                            <NumberInput
                              value={f.width}
                              min={1}
                              onCommit={(n) => update({ width: n })}
                            />
                          </Field>
                          <Field label={`${noun} length`}>
                            <NumberInput
                              value={f.length}
                              min={1}
                              onCommit={(n) => update({ length: n })}
                            />
                          </Field>
                          <Field label="Angle">
                            <NumberInput
                              value={f.angle}
                              step={15}
                              onCommit={(n) => update({ angle: n })}
                            />
                          </Field>
                        </>
                      )}
                      <Field label="Floor color">
                        <Input
                          type="color"
                          className="h-8 w-full p-1"
                          value={f.color}
                          onChange={(e) => update({ color: e.target.value })}
                        />
                      </Field>
                      {showSeams && (
                        <Field label="Seam color">
                          <Input
                            type="color"
                            className="h-8 w-full p-1"
                            value={f.seamColor}
                            onChange={(e) => update({ seamColor: e.target.value })}
                          />
                        </Field>
                      )}
                    </>
                  );
                })()}
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
