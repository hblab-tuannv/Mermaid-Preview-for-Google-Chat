/**
 * Mermaid detection for Google Chat code blocks (ADR-MAIN-002).
 *
 * Two concerns are kept separate so the fragile part (the DOM selector) is
 * isolated and the content heuristic stays pure and unit-testable:
 *   - {@link findCodeBlocks} — locates candidate code-block elements (the one
 *     place to adjust if Google Chat changes its DOM).
 *   - {@link isMermaid} — decides whether a block's text is a Mermaid diagram
 *     by matching the first token against {@link MERMAID_KEYWORDS}.
 */

/** Marker attribute used to make detection idempotent across repeated scans. */
const DETECTED_ATTR = 'data-mermaid-preview';

/**
 * Diagram-opening keywords Mermaid recognizes. Matched case-insensitively
 * against the first whitespace-delimited token of a code block. Extend here as
 * Mermaid adds diagram types.
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
] as const;

const KEYWORD_SET = new Set(MERMAID_KEYWORDS.map((k) => k.toLowerCase()));

export interface MermaidBlock {
  element: HTMLElement;
  /** The block's source text, verbatim (untrimmed). */
  source: string;
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
  return Array.from(root.querySelectorAll<HTMLElement>('pre'));
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
    const source = element.textContent ?? '';
    if (!isMermaid(source)) {
      continue;
    }
    element.setAttribute(DETECTED_ATTR, 'detected');
    found.push({ element, source });
  }
  return found;
}
