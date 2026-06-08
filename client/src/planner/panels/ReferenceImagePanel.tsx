// Reference-image controls — upload a floor-plan image to trace over, and
// align it (drag on canvas; scale/rotate/opacity/position here), lock it
// (click-through so you can edit geometry over it), hide it, or remove it.
// The image is saved with the plan on Cloud Save (see persistence/api.ts).

import { useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useReferenceImageStore } from '../store/referenceImageStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

/** Cap the longest side on upload so the dataURL stays a sane size for the DB. */
const MAX_DIM = 2560;
/** Nudge step (cm) for the arrow buttons. */
const NUDGE = 10;

/** Read a file, downscaling if larger than MAX_DIM, into a dataURL + size. */
function loadImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const longest = Math.max(w, h);
        if (longest <= MAX_DIM) {
          resolve({ dataUrl, width: w, height: h });
          return;
        }
        const k = MAX_DIM / longest;
        const cw = Math.round(w * k);
        const ch = Math.round(h * k);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: w, height: h });
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: cw, height: ch });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="w-28">{children}</div>
    </label>
  );
}

export function ReferenceImagePanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const src = useReferenceImageStore((s) => s.src);
  const x = useReferenceImageStore((s) => s.x);
  const y = useReferenceImageStore((s) => s.y);
  const scale = useReferenceImageStore((s) => s.scale);
  const rotation = useReferenceImageStore((s) => s.rotation);
  const opacity = useReferenceImageStore((s) => s.opacity);
  const visible = useReferenceImageStore((s) => s.visible);
  const locked = useReferenceImageStore((s) => s.locked);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      const { dataUrl, width, height } = await loadImageFile(file);
      useReferenceImageStore.getState().setImage(dataUrl, width, height);
    } catch {
      // ignore unreadable/corrupt files
    }
  }

  const store = useReferenceImageStore.getState;

  return (
    <section className="flex max-h-[45%] shrink-0 flex-col border-t">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">Reference image</span>
        {src && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Remove the reference image?')) store().clear();
            }}
            aria-label="Remove reference image"
            title="Remove"
            className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload reference image"
          onChange={onPick}
        />

        {!src ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-xs text-muted-foreground">
              Upload a floor-plan image to trace over and fine-tune the plan.
            </p>
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" /> Upload image
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" /> Replace image
            </Button>

            <Row label="Opacity">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                aria-label="Reference image opacity"
                onChange={(e) => store().setOpacity(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </Row>

            <Row label="Scale (cm/px)">
              <Input
                type="number"
                className="h-8"
                step={0.01}
                min={0.001}
                value={scale}
                aria-label="Reference image scale"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) store().setScale(n);
                }}
              />
            </Row>

            <Row label="Rotation (°)">
              <Input
                type="number"
                className="h-8"
                step={1}
                value={rotation}
                aria-label="Reference image rotation"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) store().setRotation(n);
                }}
              />
            </Row>

            <Row label="X (cm)">
              <Input
                type="number"
                className="h-8"
                step={1}
                value={Math.round(x)}
                aria-label="Reference image X"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) store().setPosition(n, store().y);
                }}
              />
            </Row>

            <Row label="Y (cm)">
              <Input
                type="number"
                className="h-8"
                step={1}
                value={Math.round(y)}
                aria-label="Reference image Y"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) store().setPosition(store().x, n);
                }}
              />
            </Row>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Nudge</span>
              <div className="grid grid-cols-3 grid-rows-2 gap-1">
                <span />
                <Button variant="outline" size="icon" className="size-7" aria-label="Nudge up" onClick={() => store().move(0, -NUDGE)}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <span />
                <Button variant="outline" size="icon" className="size-7" aria-label="Nudge left" onClick={() => store().move(-NUDGE, 0)}>
                  <ArrowLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-7" aria-label="Nudge down" onClick={() => store().move(0, NUDGE)}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-7" aria-label="Nudge right" onClick={() => store().move(NUDGE, 0)}>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Show</span>
              <Checkbox
                checked={visible}
                aria-label="Show reference image"
                onCheckedChange={() => store().toggleVisible()}
              />
            </label>

            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Lock (click-through)</span>
              <Checkbox
                checked={locked}
                aria-label="Lock reference image"
                onCheckedChange={() => store().toggleLock()}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
