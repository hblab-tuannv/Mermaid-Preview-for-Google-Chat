/**
 * Tests for MAIN-US-008: packaging, icons, and version reset (AC-1, AC-2, AC-3).
 * Written TDD-style: these tests were written before the implementation.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflate } from 'node:zlib';
import { promisify } from 'node:util';
import { describe, expect, it, afterAll } from 'vitest';

const ROOT = resolve(__dirname, '..');

/**
 * The single source-of-truth version, read from package.json at test time.
 * Assertions derive from this rather than a hardcoded literal so a release
 * version bump (e.g. 1.0.0 → 1.1.0, US-009) does not require editing the test —
 * the meaningful invariants are "valid semver" and "manifest === package".
 */
const EXPECTED_VERSION = (
  JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')) as { version: string }
).version;

// ---------------------------------------------------------------------------
// AC-1: Version consistency — valid semver, manifest.json matches package.json
// (US-008 reset the public version to 1.0.0; this stays version-agnostic so it
//  keeps holding across later bumps.)
// ---------------------------------------------------------------------------
describe('AC-1: version consistency', () => {
  it('package.json has a valid semver version', () => {
    expect(EXPECTED_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('public/manifest.json version matches package.json', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, 'public/manifest.json'), 'utf-8'),
    ) as { version: string };
    expect(manifest.version).toBe(EXPECTED_VERSION);
  });
});

// ---------------------------------------------------------------------------
// AC-2: manifest icons field + valid PNG files at correct sizes
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  // PNG signature: 8 bytes. IHDR chunk layout: 4 bytes length, 4 bytes 'IHDR', 4 bytes width, 4 bytes height
  const sig = buf.slice(0, 8);
  expect(sig.equals(PNG_SIGNATURE), `Invalid PNG signature in ${filePath}`).toBe(true);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('AC-2: manifest icons field', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, 'public/manifest.json'), 'utf-8'),
  ) as Record<string, unknown>;

  it('manifest has an icons field', () => {
    expect(manifest).toHaveProperty('icons');
  });

  it('manifest icons has exactly keys 16, 48, 128', () => {
    const icons = manifest.icons as Record<string, string>;
    expect(
      Object.keys(icons)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([16, 48, 128]);
  });

  it('manifest icons paths point to existing files', () => {
    const icons = manifest.icons as Record<string, string>;
    for (const [, relativePath] of Object.entries(icons)) {
      const fullPath = resolve(ROOT, 'public', relativePath);
      expect(existsSync(fullPath), `Expected file to exist: ${fullPath}`).toBe(true);
    }
  });

  it('manifest does NOT have an action field', () => {
    expect(manifest).not.toHaveProperty('action');
  });

  it('16.png is a valid PNG with 16x16 dimensions', () => {
    const icons = manifest.icons as Record<string, string>;
    const { width, height } = readPngDimensions(resolve(ROOT, 'public', icons['16']));
    expect(width).toBe(16);
    expect(height).toBe(16);
  });

  it('48.png is a valid PNG with 48x48 dimensions', () => {
    const icons = manifest.icons as Record<string, string>;
    const { width, height } = readPngDimensions(resolve(ROOT, 'public', icons['48']));
    expect(width).toBe(48);
    expect(height).toBe(48);
  });

  it('128.png is a valid PNG with 128x128 dimensions', () => {
    const icons = manifest.icons as Record<string, string>;
    const { width, height } = readPngDimensions(resolve(ROOT, 'public', icons['128']));
    expect(width).toBe(128);
    expect(height).toBe(128);
  });

  it('each PNG has a valid PNG signature', () => {
    const icons = manifest.icons as Record<string, string>;
    for (const [, relativePath] of Object.entries(icons)) {
      const fullPath = resolve(ROOT, 'public', relativePath);
      const buf = readFileSync(fullPath);
      expect(
        buf.slice(0, 8).equals(PNG_SIGNATURE),
        `Invalid PNG signature: ${relativePath}`,
      ).toBe(true);
    }
  });

  it('each PNG IDAT is a valid zlib-deflate stream (round-trip check)', async () => {
    const inflateAsync = promisify(inflate);
    const icons = manifest.icons as Record<string, string>;
    const sizes: Record<string, number> = { '16': 16, '48': 48, '128': 128 };
    for (const [key, relativePath] of Object.entries(icons)) {
      const fullPath = resolve(ROOT, 'public', relativePath);
      const buf = readFileSync(fullPath);
      // Walk PNG chunks starting after 8-byte signature
      let pos = 8;
      let idatData: Buffer | undefined;
      while (pos < buf.length - 8) {
        const chunkLen = buf.readUInt32BE(pos);
        const chunkType = buf.slice(pos + 4, pos + 8).toString('ascii');
        if (chunkType === 'IDAT') {
          idatData = buf.slice(pos + 8, pos + 8 + chunkLen);
          break;
        }
        pos += 4 + 4 + chunkLen + 4; // length + type + data + crc
      }
      expect(idatData, `No IDAT chunk in ${relativePath}`).toBeDefined();
      const decompressed = await inflateAsync(idatData!);
      const dim = sizes[key];
      // RGBA, filter byte per scanline: height * (1 + width * 4)
      expect(decompressed.length).toBe(dim * (1 + dim * 4));
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3: package.json scripts wiring
// ---------------------------------------------------------------------------
describe('AC-3: packaging scripts wiring', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')) as {
    version: string;
    scripts: Record<string, string>;
  };

  it('package.json has a copy:icons script', () => {
    expect(pkg.scripts).toHaveProperty('copy:icons');
  });

  it('copy:icons uses node -e with fs.cpSync convention', () => {
    expect(pkg.scripts['copy:icons']).toContain('node -e');
    expect(pkg.scripts['copy:icons']).toContain('cpSync');
  });

  it('package.json has a package script', () => {
    expect(pkg.scripts).toHaveProperty('package');
  });

  it('build script includes copy:icons', () => {
    expect(pkg.scripts['build']).toContain('copy:icons');
  });

  it('build script has correct order: clean before build:content before build:background before copy:manifest before copy:icons', () => {
    const build = pkg.scripts['build'];
    const clean = build.indexOf('clean');
    const buildContent = build.indexOf('build:content');
    const buildBackground = build.indexOf('build:background');
    const copyManifest = build.indexOf('copy:manifest');
    const copyIcons = build.indexOf('copy:icons');
    expect(clean).toBeGreaterThanOrEqual(0);
    expect(buildContent).toBeGreaterThan(clean);
    expect(buildBackground).toBeGreaterThan(buildContent);
    expect(copyManifest).toBeGreaterThan(buildBackground);
    expect(copyIcons).toBeGreaterThan(copyManifest);
  });

  it('package script includes npm run build', () => {
    expect(pkg.scripts['package']).toContain('npm run build');
  });

  it('package script delegates to scripts/package.mjs', () => {
    const packageScript = pkg.scripts['package'];
    expect(
      packageScript.includes('package.mjs') || packageScript.includes('scripts/package'),
      `package script should delegate to scripts/package.mjs; got: ${packageScript}`,
    ).toBe(true);
  });

  it('scripts/package.mjs exists', () => {
    expect(existsSync(resolve(ROOT, 'scripts/package.mjs'))).toBe(true);
  });

  it('raw source icon is not in public/icons (kept out of the shipped package)', () => {
    expect(existsSync(resolve(ROOT, 'public/icons/icon-raw.png'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-3 end-to-end: run npm run package, assert zip exists with correct entries
// ---------------------------------------------------------------------------
describe('AC-3 end-to-end: npm run package', () => {
  // Derive the zip name from the current version so a version bump does not
  // break this test (the packager names the zip from package.json's version).
  const zipName = `mermaid-preview-google-chat-v${EXPECTED_VERSION}.zip`;
  const zipPath = resolve(ROOT, zipName);

  afterAll(() => {
    // Clean up generated zip after test so it is not committed
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }
  });

  it(
    'npm run package creates the versioned zip file',
    () => {
      // This runs the full build+package pipeline — full vite build can take >5s
      execSync('npm run package', { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
      expect(existsSync(zipPath)).toBe(true);
    },
    120_000, // vitest per-test timeout (default 5s is too short for a full vite build)
  );

  it('zip contains manifest.json at root (not dist/manifest.json)', () => {
    const buf = readFileSync(zipPath);
    // Zip file headers store filenames uncompressed — raw binary search suffices
    const content = buf.toString('binary');
    expect(content).toContain('manifest.json');
    expect(content).not.toContain('dist/manifest.json');
  });

  it('zip contains icons/128.png at root (not dist/icons/128.png)', () => {
    const buf = readFileSync(zipPath);
    const content = buf.toString('binary');
    expect(content).toContain('icons/128.png');
    expect(content).not.toContain('dist/icons/128.png');
  });

  it('zip contains content.js at root', () => {
    const buf = readFileSync(zipPath);
    const content = buf.toString('binary');
    expect(content).toContain('content.js');
    expect(content).not.toContain('dist/content.js');
  });

  it('zip excludes OS cruft (.DS_Store / Thumbs.db)', () => {
    // package.mjs uses glob with dot:false so macOS/Windows metadata files that
    // may appear in dist/ between build and package never ship to the Store.
    const content = readFileSync(zipPath).toString('binary');
    expect(content).not.toContain('.DS_Store');
    expect(content).not.toContain('Thumbs.db');
  });
});
