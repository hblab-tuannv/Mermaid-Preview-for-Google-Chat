/**
 * Mermaid detection for Google Chat code blocks (ADR-MAIN-009, supersedes
 * ADR-MAIN-002).
 *
 * Two concerns are kept separate so the fragile part (the DOM selector) is
 * isolated and the content heuristic stays pure and unit-testable:
 *   - {@link findCodeBlocks} — locates candidate code-block elements (the one
 *     place to adjust if Google Chat changes its DOM).
 *   - {@link detectMermaidBlocks} — decides whether a block is Mermaid with a
 *     two-tier rule: an explicit ` ```mermaid ` fence is trusted directly (so
 *     every current and future diagram type is detected, with render's
 *     error-fallback catching unparseable bodies); an unfenced block falls back
 *     to the {@link isMermaid} keyword heuristic against {@link MERMAID_KEYWORDS}
 *     to keep false positives off ordinary code.
 */

/** Marker attribute used to make detection idempotent across repeated scans. */
const DETECTED_ATTR = 'data-mermaid-preview';

/**
 * Editable regions to skip. Google Chat's message composer is `contenteditable`,
 * and rendering a preview there would both show the diagram in the input box and
 * serialize the injected SVG into the sent message. `contenteditable="false"`
 * does NOT make a region editable, so it is excluded from the match.
 */
const EDITABLE_SELECTOR = '[contenteditable]:not([contenteditable="false"])';

/**
 * Diagram-opening keywords Mermaid recognizes. Matched case-insensitively
 * against the first whitespace-delimited token of a code block.
 *
 * This list is the heuristic for UNFENCED blocks only (pasted without the
 * ` ```mermaid ` tag). A fenced block is trusted directly and skips this list
 * entirely (ADR-MAIN-009), so newer/future diagram types render even if absent
 * here. Extend this only to improve detection of unfenced blocks.
 */
export const MERMAID_KEYWORDS = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
  'mindmap',
  'timeline',
  'quadrantChart',
  // Added in US-009 (ADR-MAIN-009) — names per Mermaid, including -beta suffixes.
  'xychart-beta',
  'sankey-beta',
  'block-beta',
  'packet-beta',
  'requirementDiagram',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  'kanban',
  'architecture-beta',
  'radar-beta',
  'treemap',
] as const;

// Deliberately NOT in the unfenced allowlist: `zenuml`. ZenUML ships as an
// EXTERNAL Mermaid diagram (`@mermaid-js/mermaid-zenuml`, registered via
// registerExternalDiagrams) and is NOT in the bundled core; `mermaid.render`
// throws on it (verified against mermaid 11.15.0). Listing it here would turn a
// clean unfenced `zenuml` code block into a "could not render" marker — a strict
// regression. A fence-tagged zenuml block is still detected (fence-trust) and
// shows that marker, which is the accepted AC-4 behavior for explicit fences.

const KEYWORD_SET = new Set(MERMAID_KEYWORDS.map((k) => k.toLowerCase()));

export interface MermaidBlock {
  element: HTMLElement;
  /** The block's source text, verbatim (untrimmed). */
  source: string;
}

/** The ```mermaid fence language tag Google Chat keeps as the first text line. */
const LANGUAGE_TAG = 'mermaid';

/**
 * Extract a code block's source text, converting `<br>` to `\n`. Google Chat
 * renders code-block line breaks as `<br>` elements (not `"\n"` text), so plain
 * `textContent` would collapse a multi-line diagram onto one line.
 */
export function extractSource(el: HTMLElement): string {
  let out = '';
  const walk = (node: Node): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        out += child.textContent ?? '';
      } else if (child.nodeName === 'BR') {
        out += '\n';
      } else {
        walk(child);
      }
    });
  };
  walk(el);
  return out;
}

/**
 * Strip a leading ` ```mermaid ` language-tag line and report whether one was
 * present. Chat keeps that tag as the first text line of the sent code block
 * (e.g. `"mermaid\ngraph TD..."`), which is not a diagram keyword. Only an exact
 * `mermaid` first line is removed, so real keywords like `mindmap` are never
 * touched.
 *
 * `hadTag` lets {@link detectMermaidBlocks} trust an explicit fence and skip the
 * keyword heuristic (ADR-MAIN-009): an explicit ` ```mermaid ` tag is a reliable
 * user signal, so every current and future diagram type is detected.
 */
export function stripLanguageTag(source: string): { source: string; hadTag: boolean } {
  const nl = source.indexOf('\n');
  const firstLine = (nl === -1 ? source : source.slice(0, nl)).trim();
  if (firstLine.toLowerCase() === LANGUAGE_TAG) {
    return { source: nl === -1 ? '' : source.slice(nl + 1), hadTag: true };
  }
  return { source, hadTag: false };
}

/**
 * True when `text` looks like a Mermaid diagram: its first non-empty token
 * (case-insensitive) is a known diagram keyword. Empty/whitespace → false.
 */
export function isMermaid(text: string): boolean {
  const firstToken = text.trim().split(/\s+/, 1)[0];
  if (!firstToken) {
    return false;
  }
  return KEYWORD_SET.has(firstToken.toLowerCase());
}

/**
 * Locate candidate code-block elements under `root`. We select `<pre>` (whose
 * `textContent` already includes any inner `<code>`), so each block is counted
 * once. This is the single DOM-coupling point; adjust the selector here if
 * Google Chat's markup changes.
 */
export function findCodeBlocks(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('pre')).filter(
    (el) => !el.closest(EDITABLE_SELECTOR) && !el.isContentEditable,
  );
}

/**
 * Detect Mermaid code blocks under `root`, in document order. Already-detected
 * blocks (marked via {@link DETECTED_ATTR}) are skipped, so repeated scans from
 * a MutationObserver never return the same block twice (idempotent).
 */
export function detectMermaidBlocks(root: ParentNode): MermaidBlock[] {
  const found: MermaidBlock[] = [];
  for (const element of findCodeBlocks(root)) {
    if (element.hasAttribute(DETECTED_ATTR)) {
      continue;
    }
    const { source, hadTag } = stripLanguageTag(extractSource(element));
    // A fenced ` ```mermaid ` block is trusted directly (any non-empty body is a
    // candidate, regardless of keyword) so all diagram types — current and
    // future — are detected; an unparseable body falls back at render time.
    // Unfenced blocks still go through the keyword heuristic to avoid false
    // positives on ordinary code (ADR-MAIN-009).
    const isCandidate = hadTag ? source.trim() !== '' : isMermaid(source);
    if (!isCandidate) {
      continue;
    }
    element.setAttribute(DETECTED_ATTR, 'detected');
    found.push({ element, source });
  }
  return found;
}
