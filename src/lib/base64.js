const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < CHARS.length; i++) LOOKUP[CHARS.charCodeAt(i)] = i;

// Decodes a base64 string to raw bytes without relying on atob, which isn't
// guaranteed to exist in the Hermes JS engine React Native uses.
export function base64ToBytes(base64) {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const outLen = (len / 4) * 3 - padding;
  const bytes = new Uint8Array(outLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)];
    const b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)];
    const d = LOOKUP[clean.charCodeAt(i + 3)];

    const chunk = (a << 18) | (b << 12) | ((c || 0) << 6) | (d || 0);

    if (p < outLen) bytes[p++] = (chunk >> 16) & 0xff;
    if (p < outLen) bytes[p++] = (chunk >> 8) & 0xff;
    if (p < outLen) bytes[p++] = chunk & 0xff;
  }
  return bytes;
}
