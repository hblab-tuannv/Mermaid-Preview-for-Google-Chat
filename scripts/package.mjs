/**
 * package.mjs — build artifact packager for MAIN-US-008.
 *
 * Creates `mermaid-preview-google-chat-v<version>.zip` from the contents of
 * dist/, with all entries at the archive ROOT (not nested under dist/).
 * The icons/ subdirectory is preserved as-is.
 *
 * Uses archiver v8 (devDependency, ESM-native): `npm install --save-dev archiver`
 * Called by: npm run package (after npm run build)
 *
 * Usage: node scripts/package.mjs
 */

import { ZipArchive } from 'archiver';
import { createWriteStream, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read version from package.json
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
const version = pkg.version;

const zipName = `mermaid-preview-google-chat-v${version}.zip`;
const zipPath = resolve(ROOT, zipName);
const distPath = resolve(ROOT, 'dist');

console.log(`Packaging dist/ → ${zipName}`);

const output = createWriteStream(zipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

// Wait for the output stream to close before resolving — archiver finalize()
// is async and does not guarantee the file is flushed until 'close' fires.
const done = new Promise((res, rej) => {
  output.on('close', () => {
    console.log(`Created ${zipName} (${archive.pointer()} bytes)`);
    res(undefined);
  });
  archive.on('error', rej);
});

archive.pipe(output);

// Add dist/ contents at archive ROOT — second arg false = no dest prefix.
// This ensures manifest.json, content.js, background.js, icons/ etc. all land
// at root level in the zip, not nested under dist/.
archive.directory(distPath, false);

await archive.finalize();
await done;
