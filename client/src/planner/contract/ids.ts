// Id generation for scene entities. Foundation-owned, frozen.

let counter = 0;

/**
 * Monotonic, collision-free id with a kind prefix, e.g. `vertex-3`.
 * Deterministic within a session (no Math.random) which keeps tests stable.
 */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/** Reset the counter. Used by tests to get deterministic ids. */
export function resetIds(value = 0): void {
  counter = value;
}
