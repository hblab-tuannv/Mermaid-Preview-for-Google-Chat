// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { observeChildList } from './observe';

/** A controllable MutationObserver stand-in: capture the callback, emit by hand. */
class FakeObserver {
  static last: FakeObserver | undefined;
  readonly cb: MutationCallback;
  readonly observed: { target: Node; options?: MutationObserverInit }[] = [];
  disconnected = false;

  constructor(cb: MutationCallback) {
    this.cb = cb;
    FakeObserver.last = this;
  }

  observe(target: Node, options?: MutationObserverInit): void {
    this.observed.push({ target, options });
  }

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): MutationRecord[] {
    return [];
  }

  emit(records: Partial<MutationRecord>[]): void {
    this.cb(records as MutationRecord[], this as unknown as MutationObserver);
  }
}

const Ctor = FakeObserver as unknown as typeof MutationObserver;

function withAddition(): Partial<MutationRecord> {
  return { addedNodes: [document.createElement('div')] as unknown as NodeList };
}

function attributeOnly(): Partial<MutationRecord> {
  return { addedNodes: [] as unknown as NodeList };
}

beforeEach(() => {
  FakeObserver.last = undefined;
  document.body.replaceChildren();
});

describe('observeChildList', () => {
  it('observes the target for childList mutations in the subtree (AC-4)', () => {
    observeChildList(document.body, vi.fn(), { ObserverCtor: Ctor });
    const obs = FakeObserver.last!;
    expect(obs.observed).toHaveLength(1);
    expect(obs.observed[0].target).toBe(document.body);
    expect(obs.observed[0].options).toMatchObject({ childList: true, subtree: true });
  });

  it('coalesces a burst of additions into a single onBatch per scheduled tick (AC-4)', () => {
    const tasks: (() => void)[] = [];
    const onBatch = vi.fn();
    observeChildList(document.body, onBatch, {
      ObserverCtor: Ctor,
      schedule: (fn) => tasks.push(fn),
    });
    // Three separate mutation callbacks before the scheduler runs.
    FakeObserver.last!.emit([withAddition()]);
    FakeObserver.last!.emit([withAddition()]);
    FakeObserver.last!.emit([withAddition()]);
    expect(onBatch).not.toHaveBeenCalled(); // nothing until the tick runs
    tasks.splice(0).forEach((t) => t());
    expect(onBatch).toHaveBeenCalledTimes(1); // coalesced to one scan

    // A later burst schedules a fresh scan.
    FakeObserver.last!.emit([withAddition()]);
    tasks.splice(0).forEach((t) => t());
    expect(onBatch).toHaveBeenCalledTimes(2);
  });

  it('ignores mutations that add no nodes (no wasted scan)', () => {
    const tasks: (() => void)[] = [];
    const onBatch = vi.fn();
    observeChildList(document.body, onBatch, {
      ObserverCtor: Ctor,
      schedule: (fn) => tasks.push(fn),
    });
    FakeObserver.last!.emit([attributeOnly()]);
    tasks.splice(0).forEach((t) => t());
    expect(onBatch).not.toHaveBeenCalled();
  });

  it('returns a disconnect function that stops the observer (AC-6)', () => {
    const disconnect = observeChildList(document.body, vi.fn(), { ObserverCtor: Ctor });
    expect(FakeObserver.last!.disconnected).toBe(false);
    disconnect();
    expect(FakeObserver.last!.disconnected).toBe(true);
  });

  it('defaults to the real MutationObserver and a timeout scheduler', async () => {
    const onBatch = vi.fn();
    const disconnect = observeChildList(document.body, onBatch);
    document.body.appendChild(document.createElement('pre'));
    // mutation -> (microtask) observer cb -> (macrotask) schedule -> onBatch:
    // two timer turns are needed for the scheduled batch to run.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(onBatch).toHaveBeenCalled();
    disconnect();
  });
});
