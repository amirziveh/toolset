/**
 * useLicense — Vue 3 composable for offline-first license verification
 * with TSETMC secure time and hybrid time-travel protection.
 *
 * Dependencies: jsrsasign (KJUR.crypto.Signature)
 */

import { ref } from 'vue';
import jsrsasign from 'jsrsasign';

// ── Obfuscated reactive state ──────────────────────────────────────────
/** `_x` — true when a valid (non-expired) license is present */
export const _x = ref(false);

/** `_s` — human-readable status message (error / success) */
export const _s = ref('');

/** `_p` — phone number from the active license payload */
export const _p = ref('');

/** `_e` — exp timestamp (seconds) from the active license payload */
export const _e = ref(0);

/** `_checking` — true while license verification is in progress */
export const _checking = ref(true);

// ── Internal localStorage keys (obfuscated) ────────────────────────────
const _LK = 'lk';        // stored license key string
const _TS = 'lastSecureTime'; // last trusted timestamp (ms)

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert URL-safe Base64 (RFC 4648 §5) to standard Base64 so that
 * `atob()` / jsrsasign can digest it.
 *
 * Reverses the transforms applied in generate-key.js:
 *   - '-'  → '+'
 *   - '_'  → '/'
 *   - restores '=' padding
 */
function _b64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return s;
}

/**
 * Unicode-safe Base64 encode for debug / internal use.
 */
function _btoa(s) {
  return btoa(unescape(encodeURIComponent(s)));
}

/**
 * Unicode-safe Base64 decode.
 */
function _atob(s) {
  return decodeURIComponent(escape(atob(s)));
}

// ── Secure time fetching (Iran Domestic NTP via TSETMC) ────────────────

const TSETMC_URL = 'https://cdn.tsetmc.com/api/StaticData/GetTime';
const FETCH_TIMEOUT_MS = 5_000;

/**
 * Fetch real time from TSETMC (Iran stock exchange).
 * Response format: "05/19/2026 18:17:04" (GMT)
 * Parse by appending " GMT" to the string.
 *
 * @returns {Promise<number>} Timestamp in milliseconds, or 0 on failure
 */
async function _fetchTSETMC() {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(TSETMC_URL, { signal: ctrl.signal });
    clearTimeout(id);

    if (!res.ok) return 0;

    const text = (await res.text()).trim();
    if (!text) return 0;

    // Expected format: "05/19/2026 18:17:04" — always GMT
    const d = new Date(text + ' GMT');
    const ms = d.getTime();
    return Number.isNaN(ms) ? 0 : ms;
  } catch {
    return 0;
  }
}

/**
 * Get a trusted timestamp using a hybrid approach:
 *   1. Try TSETMC NTP.
 *   2. On success → persist to localStorage & return it.
 *   3. On failure → fall back to Date.now().
 *   4. Anti-cheat: if Date.now() is > 24 h *before* the last known
 *      trusted time, the clock has been rolled back → error.
 *
 * @returns {{ ok: boolean, ms: number, error?: string }}
 */
async function getTrustedTime() {
  // 1. Try TSETMC
  const tsetmc = await _fetchTSETMC();
  if (tsetmc > 0) {
    try { localStorage.setItem(_TS, String(tsetmc)); } catch { /* noop */ }
    return { ok: true, ms: tsetmc };
  }

  // 2. Fallback to local clock
  const localNow = Date.now();

  // 3. Anti-cheat: detect clock rollback
  try {
    const prev = localStorage.getItem(_TS);
    if (prev) {
      const prevMs = Number(prev);
      if (!Number.isNaN(prevMs) && prevMs > 0) {
        // If local time is more than 24 h behind the last trusted time
        if (localNow < prevMs - 86_400_000) {
          return {
            ok: false,
            ms: 0,
            error: 'Clock manipulation detected',
          };
        }
      }
    }
  } catch { /* localStorage unavailable — skip check */ }

  return { ok: true, ms: localNow };
}

// ── Core verification ──────────────────────────────────────────────────

/**
 * Verify a license key string.
 *
 * Key format: `<URL-safe-base64(payload)>. <URL-safe-base64(signature)>`
 * Payload: `{"phone": "...", "exp": <unix-epoch-seconds>}`
 * Signature: RSA-SHA256 over the raw JSON payload string.
 *
 * @param {string} keyString  The full license key (base64.base64)
 * @param {string} publicKey  PEM-encoded RSA public key
 * @returns {Promise<{
 *   valid: boolean,
 *   expired: boolean,
 *   tampered: boolean,
 *   clockManipulated: boolean,
 *   phone: string,
 *   exp: number,
 * }>}
 */
export async function verifyLicenseKey(keyString, publicKey) {
  try {
    // Default result
    const fail = () => ({
      valid: false,
      expired: false,
      tampered: false,
      clockManipulated: false,
      phone: '',
      exp: 0,
    });

    if (!keyString || typeof keyString !== 'string' || !keyString.includes('.')) {
      _s.value = 'Invalid format';
      return { ...fail(), tampered: true };
    }

    const dotIdx = keyString.indexOf('.');
    const b64Payload = keyString.slice(0, dotIdx);
    const b64Signature = keyString.slice(dotIdx + 1);

    if (!b64Payload || !b64Signature) {
      _s.value = 'Invalid format';
      return { ...fail(), tampered: true };
    }

    // 1. Decode payload
    let payload;
    let payloadStr;
    try {
      payloadStr = _atob(_b64(b64Payload));
      payload = JSON.parse(payloadStr);
    } catch {
      _s.value = 'Invalid format';
      return { ...fail(), tampered: true };
    }

    const { phone, exp } = payload;
    if (!phone || typeof exp !== 'number') {
      _s.value = 'Invalid format';
      return { ...fail(), tampered: true };
    }

    // 2. Get trusted time
    const time = await getTrustedTime();
    if (!time.ok) {
      _s.value = time.error || 'Clock manipulation detected';
      return {
        valid: false,
        expired: false,
        tampered: false,
        clockManipulated: true,
        phone: phone || '',
        exp: exp || 0,
      };
    }

    const trustedTimeMs = time.ms;

    // 3. Check expiration
    if (trustedTimeMs > exp * 1000) {
      _s.value = 'Expired';
      return {
        valid: false,
        expired: true,
        tampered: false,
        clockManipulated: false,
        phone,
        exp,
      };
    }

    // 4. Verify RSA-SHA256 signature
    try {
      const sig = new jsrsasign.KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
      sig.init(publicKey);
      sig.updateString(payloadStr);
      // jsrsasign verify() expects signature in hex format, not base64
      const sigHex = jsrsasign.b64tohex(_b64(b64Signature));
      const isValid = sig.verify(sigHex);

      if (!isValid) {
        _s.value = 'Tampered';
        return {
          valid: false,
          expired: false,
          tampered: true,
          clockManipulated: false,
          phone,
          exp,
        };
      }
    } catch {
      _s.value = 'Tampered';
      return {
        valid: false,
        expired: false,
        tampered: true,
        clockManipulated: false,
        phone,
        exp,
      };
    }

    // ── Everything passed → persist & update state ──────────────────────
    try { localStorage.setItem(_LK, keyString); } catch { /* noop */ }

    _x.value = true;
    _s.value = 'License verified successfully';
    _p.value = phone;
    _e.value = exp;

    return {
      valid: true,
      expired: false,
      tampered: false,
      clockManipulated: false,
      phone,
      exp,
    };
  } finally {
    _checking.value = false;
  }
}

// ── Stored license re-verification (app mount) ─────────────────────────

/**
 * Check whether a previously-saved license key exists in localStorage
 * and re-verify it.  Call this once on app startup.
 *
 * @param {string} publicKey  PEM-encoded RSA public key
 * @returns {Promise<object>} Same shape as `verifyLicenseKey`
 */
export async function checkStoredLicense(publicKey) {
  _checking.value = true;
  try {
    const stored = localStorage.getItem(_LK);
    if (!stored) {
      _s.value = 'No license found';
      return {
        valid: false,
        expired: false,
        tampered: false,
        clockManipulated: false,
        phone: '',
        exp: 0,
      };
    }
    return await verifyLicenseKey(stored, publicKey);
  } catch {
    _s.value = 'No license found';
    return {
      valid: false,
      expired: false,
      tampered: false,
      clockManipulated: false,
      phone: '',
      exp: 0,
    };
  } finally {
    _checking.value = false;
  }
}