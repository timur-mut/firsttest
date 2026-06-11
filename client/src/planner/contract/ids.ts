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

/**
 * Advance the counter past the largest `prefix-N` suffix among the given ids, so
 * subsequently generated ids never collide with (and silently overwrite) ids
 * that already exist in a loaded scene.
 *
 * Loaded/edited scenes carry ids like `vertex-2` / `line-3` minted by an EARLIER
 * session's counter. After a fresh start (counter = 0) the next genId would
 * re-issue `vertex-1`, `line-1`, … and clobber existing entities. Call this
 * whenever a scene is installed (load / import / new).
 */
export function adoptIds(ids: Iterable<string>): void {
  for (const id of ids) {
    const m = /-(\d+)$/.exec(id);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > counter) counter = n;
    }
  }
}
