import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, '../public/manifest.json'), 'utf-8'),
) as Record<string, unknown>;

describe('manifest.json', () => {
  it('is Manifest V3 with a registered service worker (AC-2)', () => {
    expect(manifest.manifest_version).toBe(3);
    expect((manifest.background as { service_worker?: string }).service_worker).toBe(
      'background.js',
    );
  });

  it('injects the content script on chat.google.com and mail.google.com (US-011 AC-1/AC-3)', () => {
    const contentScripts = manifest.content_scripts as Array<{
      matches: string[];
      js: string[];
      all_frames?: boolean;
    }>;
    expect(contentScripts).toHaveLength(1);
    expect(contentScripts[0].matches).toEqual([
      'https://chat.google.com/*',
      'https://mail.google.com/*',
    ]);
    expect(contentScripts[0].js).toEqual(['content.js']);
  });

  it('injects into nested frames so the Gmail-embedded Chat iframe is covered (US-011 AC-2)', () => {
    const contentScripts = manifest.content_scripts as Array<{ all_frames?: boolean }>;
    expect(contentScripts[0].all_frames).toBe(true);
  });

  it('declares no broad or surplus permissions (AC-5)', () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('<all_urls>');
    expect(manifest.permissions).toBeUndefined();
    expect(manifest.host_permissions).toBeUndefined();
  });
});
