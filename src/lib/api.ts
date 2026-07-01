import { getSecureToken, setSecureToken, isValidHeaderValue } from "./session";

export const getAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  let base = "";

  // 1. Try import.meta.url (most reliable for module scripts in sandboxed/srcdoc iframes)
  try {
    const metaUrl = import.meta.url;
    if (metaUrl && (metaUrl.startsWith("http://") || metaUrl.startsWith("https://"))) {
      const match = metaUrl.match(/^(https?:\/\/[^\/]+)/);
      if (match) {
        base = match[1];
      }
    }
  } catch (e) {
    // Ignore
  }

  // 2. Try document.referrer (excellent fallback for sandboxed iframes)
  if (!base) {
    try {
      const referrer = document.referrer;
      if (referrer && (referrer.startsWith("http://") || referrer.startsWith("https://"))) {
        const match = referrer.match(/^(https?:\/\/[^\/]+)/);
        if (match) {
          if (match[1].includes("run.app") || match[1].includes("localhost")) {
            base = match[1];
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 3. Try document.baseURI
  if (!base) {
    try {
      const baseURI = document.baseURI;
      if (baseURI && (baseURI.startsWith("http://") || baseURI.startsWith("https://"))) {
        const match = baseURI.match(/^(https?:\/\/[^\/]+)/);
        if (match) {
          base = match[1];
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 4. Try window.location.href
  if (!base) {
    try {
      const href = window.location.href;
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        const match = href.match(/^(https?:\/\/[^\/]+)/);
        if (match) {
          base = match[1];
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 5. Try window.location.origin
  if (!base) {
    try {
      if (window.location.origin && window.location.origin !== "null") {
        base = window.location.origin;
      }
    } catch (e) {
      // Ignore
    }
  }

  // 6. Try parsing scripts
  if (!base) {
    try {
      const scripts = document.getElementsByTagName("script");
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
          const match = src.match(/^(https?:\/\/[^\/]+)/);
          if (match) {
            base = match[1];
            break;
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 7. Dynamic fallback: detect if we're in the 'ais-pre' or 'ais-dev' environment
  if (!base) {
    try {
      const currentHref = window.location.href || "";
      const currentReferrer = document.referrer || "";
      if (currentHref.includes("ais-pre") || currentReferrer.includes("ais-pre")) {
        base = "https://ais-pre-q6hl4mjx5oh42sdngg7ckm-876553119079.asia-east1.run.app";
      } else {
        base = "https://ais-dev-q6hl4mjx5oh42sdngg7ckm-876553119079.asia-east1.run.app";
      }
    } catch (e) {
      base = "https://ais-dev-q6hl4mjx5oh42sdngg7ckm-876553119079.asia-east1.run.app";
    }
  }

  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export const sanitizeRequestOptions = (options: any): RequestInit => {
  const sanitized: any = {};
  if (!options || typeof options !== "object") {
    return sanitized;
  }

  // Validate method
  if (typeof options.method === "string" && options.method.trim() !== "") {
    sanitized.method = options.method.trim().toUpperCase();
  } else {
    sanitized.method = "GET";
  }

  // Validate headers (could be object, Array, or Headers instance)
  if (options.headers !== undefined && options.headers !== null) {
    sanitized.headers = options.headers;
  }

  // Validate body (only allowed for non-GET/HEAD requests)
  if (options.body !== undefined && options.body !== null) {
    sanitized.body = options.body;
  }

  // Validate mode
  if (typeof options.mode === "string") {
    const m = options.mode.trim().toLowerCase();
    if (["same-origin", "no-cors", "cors"].includes(m)) {
      sanitized.mode = m;
    }
  }

  // Validate credentials
  if (typeof options.credentials === "string") {
    const c = options.credentials.trim().toLowerCase();
    if (["omit", "same-origin", "include"].includes(c)) {
      sanitized.credentials = c;
    }
  }

  // Validate cache
  if (typeof options.cache === "string") {
    const c = options.cache.trim().toLowerCase();
    if (["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"].includes(c)) {
      sanitized.cache = c;
    }
  }

  // Validate redirect
  if (typeof options.redirect === "string") {
    const r = options.redirect.trim().toLowerCase();
    if (["follow", "error", "manual"].includes(r)) {
      sanitized.redirect = r;
    }
  }

  // Validate referrerPolicy
  if (typeof options.referrerPolicy === "string") {
    const rp = options.referrerPolicy.trim().toLowerCase();
    if (
      [
        "",
        "no-referrer",
        "no-referrer-when-downgrade",
        "same-origin",
        "origin",
        "strict-origin",
        "origin-when-cross-origin",
        "strict-origin-when-cross-origin",
        "unsafe-url"
      ].includes(rp)
    ) {
      sanitized.referrerPolicy = rp;
    }
  }

  // Validate signal
  if (options.signal && typeof AbortSignal !== "undefined" && options.signal instanceof AbortSignal) {
    sanitized.signal = options.signal;
  }

  // Validate priority (fetchpriority)
  if (typeof options.priority === "string") {
    const p = options.priority.trim().toLowerCase();
    if (["high", "low", "auto"].includes(p)) {
      sanitized.priority = p;
    }
  }

  // Validate integrity
  if (typeof options.integrity === "string" && options.integrity.trim() !== "") {
    sanitized.integrity = options.integrity.trim();
  }

  // Validate keepalive
  if (typeof options.keepalive === "boolean") {
    sanitized.keepalive = options.keepalive;
  }

  // Strip body for GET/HEAD
  if (["GET", "HEAD"].includes(sanitized.method)) {
    delete sanitized.body;
  }

  return sanitized;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getSecureToken("uptimepro_authToken");
  
  const cleanHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        if (value !== undefined && value !== null) {
          const valStr = String(value);
          if (isValidHeaderValue(valStr) && isValidHeaderValue(key)) {
            cleanHeaders[key] = valStr;
          }
        }
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const valStr = String(value);
          if (isValidHeaderValue(valStr) && isValidHeaderValue(key)) {
            cleanHeaders[key] = valStr;
          }
        }
      });
    } else {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const valStr = String(value);
          if (isValidHeaderValue(valStr) && isValidHeaderValue(key)) {
            cleanHeaders[key] = valStr;
          }
        }
      });
    }
  }

  if (token && isValidHeaderValue(token)) {
    cleanHeaders["x-auth-token"] = token;
  }
  
  const fetchOptions = sanitizeRequestOptions(options);
  fetchOptions.headers = cleanHeaders;
  
  const absoluteUrl = getAbsoluteUrl(url);
  
  let response;
  try {
    response = await fetch(absoluteUrl, fetchOptions);
  } catch (err: any) {
    if (err.name === "AbortError" || err.message?.includes("aborted")) {
      throw err;
    }
    const safeOptions = { ...fetchOptions };
    if ("signal" in safeOptions) delete (safeOptions as any).signal;
    let serializedOptions = "{}";
    try {
      serializedOptions = JSON.stringify(safeOptions);
    } catch (e) {
      serializedOptions = "[Unserializable options]";
    }
    console.error(`fetch call failed! URL: "${absoluteUrl}" | Options: ${serializedOptions} | Error: ${err.message}`);
    throw err;
  }
  
  // Anti-hijacking seamless token rotation interception
  try {
    const rotatedToken = response.headers.get("x-rotated-token");
    if (rotatedToken) {
      setSecureToken(rotatedToken, "uptimepro_authToken");
    }
  } catch (err) {
    // Suppress header extraction errors
  }
  
  return response;
};

