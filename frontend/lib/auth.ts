const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
}

// Silently refresh the access token using the stored refresh token.
// Returns true if successful, false if refresh failed (user must re-login).
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    const res = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Drop-in replacement for fetch() that auto-refreshes the access token on 401.
// Use this instead of bare fetch() for all authenticated API calls.
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = { ...getAuthHeaders(), ...(options.headers as Record<string, string> ?? {}) };
  const res = await fetch(url, { ...options, headers });

  if (res.status !== 401) return res;

  // Access token expired — try refresh
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    // Refresh failed — kick to login
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
    return res;
  }

  // Retry with new token
  const retryHeaders = { ...getAuthHeaders(), ...(options.headers as Record<string, string> ?? {}) };
  return fetch(url, { ...options, headers: retryHeaders });
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Proceed with local cleanup even if server logout fails
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
  }
}
