/**
 * Escape every non-ASCII UTF-16 code unit in `code` to a `\uXXXX` sequence.
 *
 * Why this exists (ADR-MAIN-005): the bundled Mermaid `content.js` contains a
 * literal Unicode non-character (U+FFFF) inside a regex range. That is valid
 * UTF-8 byte-wise, but Chrome loads content scripts through
 * `base::IsStringUTF8()`, which rejects Unicode non-characters — so the load
 * fails with "It isn't UTF-8 encoded". Rolldown (Vite 8's bundler/minifier) has
 * no ASCII-output option, so we post-process the emitted chunk ourselves.
 *
 * Escaping per UTF-16 code unit (not per code point) keeps the result identical
 * in both string and regex literals, with or without the `u` flag — surrogate
 * pairs become `\uD8XX\uDCXX`, matching how the raw character behaves. This is
 * the same transform esbuild's `charset:'ascii'` and terser's `ascii_only`
 * apply. Safe because the non-ASCII characters in a minified bundle live in
 * string/regex/template literals, never in identifiers.
 */
export function escapeNonAscii(code: string): string {
  let out = '';
  for (let i = 0; i < code.length; i++) {
    const unit = code.charCodeAt(i);
    if (unit > 0x7f) {
      out += '\\u' + unit.toString(16).padStart(4, '0');
    } else {
      out += code[i];
    }
  }
  return out;
}
