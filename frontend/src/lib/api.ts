const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<{ data: T; error: string | null }> {
  const { method = 'GET', body, token, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok) {
      return { data: null as any, error: json.error?.message || `Erreur ${response.status}` };
    }

    return { data: json.data ?? json, error: null };
  } catch (err: any) {
    return { data: null as any, error: err.message || 'Erreur réseau' };
  }
}

// Convenience methods
export const apiGet = <T = any>(endpoint: string, token?: string) =>
  api<T>(endpoint, { token });

export const apiPost = <T = any>(endpoint: string, body: any, token?: string) =>
  api<T>(endpoint, { method: 'POST', body, token });

export const apiPatch = <T = any>(endpoint: string, body: any, token?: string) =>
  api<T>(endpoint, { method: 'PATCH', body, token });

export const apiDelete = <T = any>(endpoint: string, token?: string) =>
  api<T>(endpoint, { method: 'DELETE', token });
