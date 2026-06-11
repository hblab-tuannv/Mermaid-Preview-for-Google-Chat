// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectTheme, observeThemeChange } from './theme';

beforeEach(() => {
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  document.body.removeAttribute('class');
  document.body.replaceChildren();
});

function preIn(parent: HTMLElement): HTMLElement {
  const pre = document.createElement('pre');
  parent.appendChild(pre);
  return pre;
}

describe('detectTheme', () => {
  it('returns "dark" when the nearest opaque background is dark (AC-1)', () => {
    const surface = document.createElement('div');
    surface.style.backgroundColor = 'rgb(20, 20, 20)';
    document.body.appendChild(surface);
    expect(detectTheme(preIn(surface))).toBe('dark');
  });

  it('returns "default" when the nearest opaque background is light (AC-1)', () => {
    const surface = document.createElement('div');
    surface.style.backgroundColor = 'rgb(255, 255, 255)';
    document.body.appendChild(surface);
    expect(detectTheme(preIn(surface))).toBe('default');
  });

  it('walks up past transparent ancestors to the first opaque background (AC-1)', () => {
    const dark = document.createElement('div');
    dark.style.backgroundColor = 'rgb(10, 10, 12)';
    const transparent = document.createElement('div'); // no background
    dark.appendChild(transparent);
    document.body.appendChild(dark);
    expect(detectTheme(preIn(transparent))).toBe('dark');
  });

  it('falls back to "default" when no ancestor has an opaque background (AC-2)', () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);
    expect(detectTheme(preIn(plain))).toBe('default');
  });
});

/** Controllable observer + a captured-record emitter. */
class FakeObserver {
  static last: FakeObserver | undefined;
  readonly cb: MutationCallback;
  disconnected = false;
  observedAttributes = 0;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    FakeObserver.last = this;
  }
  observe(_t: Node, options?: MutationObserverInit): void {
    if (options?.attributes) this.observedAttributes += 1;
  }
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): MutationRecord[] {
    return [];
  }
  emit(): void {
    this.cb([{} as MutationRecord], this as unknown as MutationObserver);
  }
}
const Ctor = FakeObserver as unknown as typeof MutationObserver;

function setBodyTheme(dark: boolean): void {
  document.body.style.backgroundColor = dark ? 'rgb(15, 15, 15)' : 'rgb(255, 255, 255)';
}

describe('observeThemeChange', () => {
  it('observes attribute mutations on <html> and <body> (AC-6)', () => {
    setBodyTheme(false);
    observeThemeChange(document, vi.fn(), { ObserverCtor: Ctor });
    expect(FakeObserver.last!.observedAttributes).toBe(2);
  });

  it('calls onChange only when the page theme actually flips (AC-4)', () => {
    setBodyTheme(false); // start light
    const tasks: (() => void)[] = [];
    const onChange = vi.fn();
    observeThemeChange(document, onChange, {
      ObserverCtor: Ctor,
      schedule: (fn) => tasks.push(fn),
    });

    // A mutation that does NOT change the theme → no callback.
    FakeObserver.last!.emit();
    tasks.splice(0).forEach((t) => t());
    expect(onChange).not.toHaveBeenCalled();

    // Now flip to dark and mutate → callback once with 'dark'.
    setBodyTheme(true);
    FakeObserver.last!.emit();
    tasks.splice(0).forEach((t) => t());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('coalesces a burst of attribute mutations into one theme check (AC-6)', () => {
    setBodyTheme(false);
    const tasks: (() => void)[] = [];
    const onChange = vi.fn();
    observeThemeChange(document, onChange, {
      ObserverCtor: Ctor,
      schedule: (fn) => tasks.push(fn),
    });
    setBodyTheme(true);
    FakeObserver.last!.emit();
    FakeObserver.last!.emit();
    FakeObserver.last!.emit();
    tasks.splice(0).forEach((t) => t());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('returns a disconnect function (AC-6)', () => {
    setBodyTheme(false);
    const disconnect = observeThemeChange(document, vi.fn(), { ObserverCtor: Ctor });
    expect(FakeObserver.last!.disconnected).toBe(false);
    disconnect();
    expect(FakeObserver.last!.disconnected).toBe(true);
  });
});
