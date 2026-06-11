import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { escapeNonAscii } from './build/ascii-escape';

/**
 * Rewrite emitted JS chunks to ASCII-only so Chrome's content-script loader
 * (`base::IsStringUTF8`, which rejects Unicode non-characters like U+FFFF in the
 * Mermaid bundle) accepts them. Rolldown (Vite 8) has no ASCII-output option, so
 * we escape in `generateBundle`, after minification. See ADR-MAIN-005.
 */
function asciiOnlyOutput(): Plugin {
  return {
    name: 'ascii-only-output',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          file.code = escapeNonAscii(file.code);
        }
      }
    },
  };
}

/**
 * MV3 content scripts must be classic (IIFE) bundles, so each entry is built
 * separately (rollup cannot emit IIFE for a multi-entry, code-split build).
 * `BUILD_TARGET` selects which entry this invocation builds; the `build` npm
 * script chains the targets and then copies the hand-authored manifest.
 * See ADR-MAIN-001.
 */
const entries = {
  content: resolve(__dirname, 'src/content/index.ts'),
  background: resolve(__dirname, 'src/background/index.ts'),
} as const;

type Target = keyof typeof entries;

const target = (process.env.BUILD_TARGET as Target) ?? 'content';

export default defineConfig({
  plugins: [asciiOnlyOutput()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: entries[target],
      formats: ['iife'],
      name: `MermaidPreview_${target}`,
      fileName: () => `${target}.js`,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
