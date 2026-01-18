/**
 * User Fingerprint Generator
 *
 * Generates a unique token based on browser fingerprint.
 * Used to prevent duplicate votes without requiring login.
 *
 * Uses: @fingerprintjs/fingerprintjs (open source)
 */

// Simple hash function (for fallback if FingerprintJS not loaded)
async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 16 chars
}

/**
 * Get user fingerprint token
 *
 * @returns {Promise<string>} Unique token (16 chars)
 */
export async function getUserToken() {
  try {
    // Try to use FingerprintJS if available
    if (typeof FingerprintJS !== 'undefined') {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId;
    }

    // Fallback: Generate fingerprint from browser properties
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      navigator.platform
    ].join('|');

    return await simpleHash(fingerprint);

  } catch (error) {
    console.error('Error generating fingerprint:', error);

    // Ultimate fallback: Use localStorage
    let token = localStorage.getItem('user_token');
    if (!token) {
      token = await simpleHash(Math.random().toString() + Date.now());
      localStorage.setItem('user_token', token);
    }
    return token;
  }
}

/**
 * Check if fingerprinting is available
 */
export function isFingerprintAvailable() {
  return typeof FingerprintJS !== 'undefined';
}

/**
 * Get fingerprint components (for debugging)
 */
export async function getFingerprintComponents() {
  if (typeof FingerprintJS === 'undefined') {
    return { error: 'FingerprintJS not loaded' };
  }

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.components;
}
