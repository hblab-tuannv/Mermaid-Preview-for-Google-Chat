/**
 * Live DOM observation for dynamically loaded Google Chat messages
 * (ADR-MAIN-004). A thin, Mermaid-agnostic wrapper over `MutationObserver`:
 * the content script wires {@link observeChildList} to re-run detection+render
 * whenever new nodes appear. Both the observer constructor and the debounce
 * scheduler are injectable so the logic is unit-testable under jsdom without
 * timing flakiness.
 */

export interface ObserveOptions {
  /** Observer constructor; defaults to the global `MutationObserver`. */
  ObserverCtor?: typeof MutationObserver;
  /**
   * Schedules a coalesced batch callback. Defaults to a `setTimeout(fn, 0)`
   * macrotask, which gathers a burst of mutations into one scan.
   */
  schedule?: (fn: () => void) => void;
}

/**
 * Observe `target` for child additions anywhere in its subtree and call
 * `onBatch` once per coalesced burst. Mutations that add no nodes (attribute or
 * text-only churn) are ignored. Returns a disconnect function (AC-6) so callers
 * can stop observing and avoid leaking the listener.
 */
export function observeChildList(
  target: Node,
  onBatch: () => void,
  opts: ObserveOptions = {},
): () => void {
  const ObserverCtor = opts.ObserverCtor ?? MutationObserver;
  const schedule = opts.schedule ?? ((fn) => setTimeout(fn, 0));

  // Coalesce a burst of mutation callbacks into a single scheduled scan: the
  // first addition arms a pending tick; further additions before it fires are
  // folded in. Detection downstream is idempotent, so one scan per tick covers
  // the whole burst (ADR-MAIN-004).
  let pending = false;
  const observer = new ObserverCtor((mutations) => {
    const added = mutations.some((m) => m.addedNodes.length > 0);
    if (!added || pending) {
      return;
    }
    pending = true;
    schedule(() => {
      pending = false;
      onBatch();
    });
  });

  observer.observe(target, { childList: true, subtree: true });
  return () => observer.disconnect();
}
