export const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export const TIMEOUT_MS = 8000;

export const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal as any });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

/* Clasificacion unica de fallos de red (auditoria Codex EH-07): antes cada
   pantalla distinguia timeout/red/HTTP/JSON invalido a mano y de forma
   distinta. `code` es el campo `error` que ya devuelve el backend en su
   body JSON (ej. "NODE_NOT_FOUND") cuando el status no es 2xx. */
export type AppErrorKind = 'timeout' | 'network' | 'http' | 'parse';

export type AppError = {
  kind: AppErrorKind;
  message: string;
  status?: number;
  code?: string;
};

function httpErrorMessage(status: number, code?: string): string {
  if (code === 'NODE_NOT_FOUND') return 'This chapter no longer exists.';
  if (status >= 500) return 'Tunnel active, but local backend inoperative.';
  return `Request failed (${status}).`;
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, options);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw { kind: 'timeout', message: `Extreme latency. (${TIMEOUT_MS / 1000}s timeout).` } as AppError;
    }
    throw { kind: 'network', message: 'Data link failure. Server unreachable.' } as AppError;
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      const body = await response.json();
      code = body?.error;
    } catch {
      // Body no era JSON (ej. 502 de un proxy) — sin code, mensaje generico igual sirve.
    }
    throw { kind: 'http', status: response.status, code, message: httpErrorMessage(response.status, code) } as AppError;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw { kind: 'parse', message: 'Malformed server response.' } as AppError;
  }
}
