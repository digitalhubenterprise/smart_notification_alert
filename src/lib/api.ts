export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("uptimepro_authToken");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  if (token) {
    headers["x-auth-token"] = token;
  }
  return fetch(url, { ...options, headers });
};
