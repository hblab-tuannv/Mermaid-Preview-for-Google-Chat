import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

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
