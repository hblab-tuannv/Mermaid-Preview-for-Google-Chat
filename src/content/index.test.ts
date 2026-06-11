// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX, createLogger } from '../lib/logger';
import type { MermaidRenderer } from '../lib/render';
import { CONTENT_LOADED_MESSAGE, initContentScript, previewMermaidIn } from './index';

// The default renderer dynamically imports mermaid; mock it so any observer left
// running by a test (the real-MutationObserver path) cannot reject on import.
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string) => ({ svg: `<svg id="${id}"></svg>` })),
  },
}));

/** Controllable MutationObserver stand-in for the observer-wiring tests. */
class FakeObserver {
  static last: FakeObserver | undefined;
  readonly cb: MutationCallback;
  disconnected = false;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    FakeObserver.last = this;
  }
  observe(): void {}
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

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  FakeObserver.last = undefined;
  document.body.replaceChildren();
});

function okRenderer(): MermaidRenderer {
  return {
    async render(id) {
      return { svg: `<svg id="${id}"></svg>` };
    },
  };
}

function mountCode(text: string): void {
  const pre = document.createElement('pre');
  pre.textContent = text;
  document.body.appendChild(pre);
}

describe('initContentScript', () => {
  it('logs the loaded message exactly once per page load (AC-3 of US-001)', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(CONTENT_LOADED_MESSAGE);
  });

  it('emits the prefixed line end-to-end through a real logger', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(createLogger(sink));
    expect(sink.info).toHaveBeenCalledWith(`${LOG_PREFIX} ${CONTENT_LOADED_MESSAGE}`);
  });
});

describe('previewMermaidIn', () => {
  it('renders only the Mermaid blocks under the root (US-003 wiring)', async () => {
    mountCode('function foo(){}');
    mountCode('graph TD\nA-->B');
    const count = await previewMermaidIn(document, { renderer: okRenderer() });
    expect(count).toBe(1); // only the Mermaid block is detected and rendered
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
  });

  it('returns 0 when there is no document scope', async () => {
    vi.stubGlobal('document', undefined);
    try {
      expect(await previewMermaidIn(undefined)).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('initContentScript observer wiring (US-004)', () => {
  const Ctor = FakeObserver as unknown as typeof MutationObserver;
  const tasks: (() => void)[] = [];
  const runTasks = (): void => tasks.splice(0).forEach((t) => t());

  function init(): () => void {
    return initContentScript(
      { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      {
        renderer: okRenderer(),
        observe: { ObserverCtor: Ctor, schedule: (fn) => tasks.push(fn) },
      },
    );
  }

  it('renders a Mermaid block added after load (AC-4)', async () => {
    init();
    await flush(); // initial scan over the (empty) page
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(0);

    mountCode('graph TD\nA-->B'); // a new message arrives
    FakeObserver.last!.emit([{ addedNodes: [document.body.lastChild] as unknown as NodeList }]);
    runTasks();
    await flush();
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
  });

  it('does not double-render an already-handled block across scans (AC-5)', async () => {
    init();
    mountCode('graph TD\nA-->B');
    FakeObserver.last!.emit([{ addedNodes: [document.body.lastChild] as unknown as NodeList }]);
    runTasks();
    await flush();
    // A second burst re-scans the whole subtree; the block is already detected.
    FakeObserver.last!.emit([{ addedNodes: [document.body.lastChild] as unknown as NodeList }]);
    runTasks();
    await flush();
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-mermaid-toggle]')).toHaveLength(1);
  });

  it('produces nothing for a mutation with no Mermaid block (AC-6)', async () => {
    init();
    mountCode('function foo(){}'); // not a diagram
    FakeObserver.last!.emit([{ addedNodes: [document.body.lastChild] as unknown as NodeList }]);
    runTasks();
    await flush();
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-mermaid-toggle]')).toHaveLength(0);
  });

  it('returns a disconnect function that tears down the observer (AC-6)', () => {
    const disconnect = init();
    expect(FakeObserver.last!.disconnected).toBe(false);
    disconnect();
    expect(FakeObserver.last!.disconnected).toBe(true);
  });

  it('returns a no-op disconnect when there is no document', () => {
    vi.stubGlobal('document', undefined);
    try {
      const disconnect = initContentScript({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
      expect(() => disconnect()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('initContentScript theme re-render wiring (US-005)', () => {
  const Ctor = FakeObserver as unknown as typeof MutationObserver;

  it('re-renders all diagrams at the new theme when Chat flips light→dark (AC-4)', async () => {
    document.body.replaceChildren();
    document.body.style.backgroundColor = 'rgb(255, 255, 255)'; // start light

    const themes: (string | undefined)[] = [];
    const renderer = {
      async render(id: string, _source: string, theme?: string) {
        themes.push(theme);
        return { svg: `<svg id="${id}"></svg>` };
      },
    };
    const themeTasks: (() => void)[] = [];
    initContentScript(
      { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      {
        renderer,
        // childList observer left real (harmless); drive only the theme observer.
        themeObserve: { ObserverCtor: Ctor, schedule: (fn) => themeTasks.push(fn) },
      },
    );

    mountCode('graph TD\nA-->B');
    await previewMermaidIn(document.body, { renderer });
    expect(themes).toEqual(['default']); // rendered light
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);

    // Chat flips to dark; the theme observer fires.
    document.body.style.backgroundColor = 'rgb(16, 16, 16)';
    FakeObserver.last!.emit([{}]);
    themeTasks.splice(0).forEach((t) => t());
    await flush();

    // The diagram was reset and re-rendered at the dark theme — still exactly one.
    expect(themes).toEqual(['default', 'dark']);
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
  });
});
