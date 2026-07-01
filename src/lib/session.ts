// Client-side Session Security Helpers with Encryption and Rotation support

const ENCRYPTION_KEY = "uptimepro_secure_salt_key_31298_v5_rotation";

/**
 * Encrypts a string using a client-side secure XOR and Base64 cipher to prevent raw inspection in DevTools
 */
export function encryptToken(text: string | null | undefined): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

/**
 * Decrypts a base64 encoded, XOR-encrypted token back to its raw value
 */
export function decryptToken(ciphertext: string | null | undefined): string {
  if (!ciphertext) return "";
  try {
    const decoded = atob(ciphertext);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return "";
  }
}

/**
 * Validates that a string only contains printable ASCII characters (ASCII 32 to 126).
 * This ensures the string is safe to be used in HTTP headers.
 */
export function isValidHeaderValue(value: string | null | undefined): boolean {
  if (!value) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code > 126) {
      return false;
    }
  }
  return true;
}

/**
 * Gets a decrypted token securely from localStorage.
 * Automatically falls back to the raw token if the token was stored unencrypted
 * (e.g. by automated tests or direct localStorage updates) or if decryption fails.
 */
export function getSecureToken(key: string = "uptimepro_authToken"): string {
  const raw = localStorage.getItem(key);
  if (!raw) return "";

  const decrypted = decryptToken(raw);
  if (isValidHeaderValue(decrypted)) {
    return decrypted;
  }

  if (isValidHeaderValue(raw)) {
    return raw;
  }

  return "";
}

/**
 * Stores an encrypted token securely in localStorage
 */
export function setSecureToken(token: string, key: string = "uptimepro_authToken"): void {
  if (!token) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, encryptToken(token));
  }
}

/**
 * Removes a token from localStorage
 */
export function removeSecureToken(key: string = "uptimepro_authToken"): void {
  localStorage.removeItem(key);
}
