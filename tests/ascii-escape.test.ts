import { describe, expect, it } from 'vitest';
import { escapeNonAscii } from '../build/ascii-escape';

/** Chrome's content-script check (base::IsStringUTF8) rejects Unicode non-characters. */
function hasNonCharacter(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (
      cp === 0xfffe ||
      cp === 0xffff ||
      (cp >= 0xfdd0 && cp <= 0xfdef) ||
      (cp & 0xffff) >= 0xfffe
    ) {
      return true;
    }
  }
  return false;
}

const isAsciiOnly = (s: string): boolean => [...s].every((c) => c.charCodeAt(0) <= 0x7f);

describe('escapeNonAscii', () => {
  it('escapes the U+FFFF non-character that breaks Chrome loading (root cause)', () => {
    const input = 'const r=/[豈-￿]/;'; // the mermaid regex range shape
    const out = escapeNonAscii(input);
    expect(out).toBe('const r=/[\\uf900-\\uffff]/;');
    expect(hasNonCharacter(out)).toBe(false);
    expect(isAsciiOnly(out)).toBe(true);
  });

  it('leaves pure-ASCII code untouched', () => {
    const input = 'var x = "hello"; // ok\nconst y=`a${x}b`;';
    expect(escapeNonAscii(input)).toBe(input);
  });

  it('escapes per UTF-16 code unit, including astral chars as surrogate pairs', () => {
    expect(escapeNonAscii('"é"')).toBe('"\\u00e9"'); // é → é
    expect(escapeNonAscii('"\u{1F600}"')).toBe('"\\ud83d\\ude00"'); // 😀 → surrogate pair
  });

  it('produces output whose escaped value round-trips to the original', () => {
    const input = 'a￿bc\u{1F4A9}d';
    // Interpreting the escaped JS string literal must recover the original chars.
    const recovered = JSON.parse('"' + escapeNonAscii(input) + '"');
    expect(recovered).toBe(input);
    expect(isAsciiOnly(escapeNonAscii(input))).toBe(true);
  });
});
