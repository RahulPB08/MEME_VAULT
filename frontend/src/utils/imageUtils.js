/**
 * imageUtils.js
 * Centralised image URL resolution for MemeVault.
 *
 * Problem solved:
 *  - Pinata JWT was not configured → backend returned random mock IPFS CIDs
 *    (e.g. "Qm" + random chars) that were stored in MongoDB as image URLs.
 *  - Those fake CIDs obviously don't exist on IPFS → images break immediately.
 *  - Additionally, blob: URLs (from URL.createObjectURL) are ephemeral —
 *    they die when the tab is closed, so they must NEVER be persisted.
 *
 * This utility:
 *  1. Detects blob URLs and returns the PLACEHOLDER immediately.
 *  2. Converts bare IPFS CIDs / ipfs://… URIs into a public gateway URL.
 *  3. Tries multiple IPFS gateways with a race so that slow/down gateways
 *     don't break the image.
 *  4. Falls back to a pretty SVG placeholder.
 */

// Public IPFS gateways — tried in order
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

// Pretty SVG placeholder shown when no image is available
export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect fill="#111118" width="400" height="400"/>
      <rect fill="#1a1a2e" x="40" y="40" width="320" height="320" rx="20"/>
      <text fill="#7c3aed" font-size="90" x="50%" y="50%"
            dominant-baseline="middle" text-anchor="middle">🎭</text>
      <text fill="#4a4a6a" font-size="14" x="50%" y="75%"
            dominant-baseline="middle" text-anchor="middle">Image unavailable</text>
    </svg>`
  );

/**
 * Detect whether a string looks like a bare IPFS CID (v0 or v1).
 */
function isCID(str) {
  if (!str || typeof str !== 'string') return false;
  // CIDv0: starts with Qm, 46 chars
  if (/^Qm[a-zA-Z0-9]{44}$/.test(str)) return true;
  // CIDv1: starts with b (base32) or f (hex), length >= 46
  if (/^[bf][a-zA-Z0-9]{45,}$/.test(str)) return true;
  return false;
}

/**
 * Normalise any image value into an https:// URL ready for <img src>.
 *
 * Handles:
 *  - null / undefined / empty string        → PLACEHOLDER_IMG
 *  - blob: URLs                             → PLACEHOLDER_IMG (ephemeral)
 *  - ipfs://<CID>[/path]                   → Pinata gateway URL
 *  - Bare CID (Qm… or b…)                 → Pinata gateway URL
 *  - https://gateway.pinata.cloud/ipfs/… → same (pass-through)
 *  - Any other https?:// URL               → pass-through
 */
export function resolveImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return PLACEHOLDER_IMG;
  }

  const url = rawUrl.trim();

  // Ephemeral browser object URL — never persisted, always show placeholder
  if (url.startsWith('blob:')) {
    return PLACEHOLDER_IMG;
  }

  // Known mock/stub hash when Pinata is not configured — show placeholder immediately
  if (url.includes('QmMOCK_PINATA_NOT_CONFIGURED')) {
    return PLACEHOLDER_IMG;
  }

  // ipfs:// scheme
  if (url.startsWith('ipfs://')) {
    const cid = url.slice(7); // strip "ipfs://"
    return `${IPFS_GATEWAYS[0]}${cid}`;
  }

  // Bare CID (not a full URL)
  if (isCID(url)) {
    return `${IPFS_GATEWAYS[0]}${url}`;
  }

  // Already a full URL (http/https) — pass through
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Unknown format — show placeholder
  return PLACEHOLDER_IMG;
}

/**
 * React onError handler that cycles through fallback gateways.
 * Attach as: <img onError={makeGatewayFallback(cid)} />
 *
 * @param {string} cid - bare IPFS CID extracted from the image URL
 */
export function makeGatewayFallback(rawUrl) {
  // Extract the CID / path portion from whatever URL format we have
  let cidPath = rawUrl;
  if (rawUrl?.startsWith('ipfs://')) cidPath = rawUrl.slice(7);
  else if (rawUrl?.includes('/ipfs/')) cidPath = rawUrl.split('/ipfs/')[1];

  let attempt = 0;

  return function onError(e) {
    attempt++;
    if (attempt < IPFS_GATEWAYS.length && cidPath) {
      e.target.src = `${IPFS_GATEWAYS[attempt]}${cidPath}`;
    } else {
      // All gateways exhausted — show placeholder and stop retrying
      e.target.onerror = null;
      e.target.src = PLACEHOLDER_IMG;
    }
  };
}
