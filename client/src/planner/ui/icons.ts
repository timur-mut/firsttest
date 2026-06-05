// Resolve a lucide-react icon by name. Foundation-owned helper used by panels.

import * as Lucide from 'lucide-react';
import type { ComponentType } from 'react';

type IconProps = { className?: string; size?: number | string };

/** Look up a lucide icon component by name, falling back to a square. */
export function iconByName(name: string): ComponentType<IconProps> {
  const map = Lucide as unknown as Record<string, ComponentType<IconProps>>;
  return map[name] ?? Lucide.Square;
}
