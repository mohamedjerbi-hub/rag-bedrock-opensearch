export function getApiBaseUrl(): string {
  // 1. Check window runtime override (e.g. injected at runtime)
  if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
    return String((window as any).__API_BASE_URL__).trim().replace(/\/$/, '');
  }

  // 2. Read Vite build-time environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 3. Check if running in production (Vercel or non-localhost domain)
  const isProduction = import.meta.env.PROD || (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  );

  if (isProduction) {
    console.warn('[API Client] ⚠️ VITE_API_BASE_URL est manquant ou vide en production. Assurez-vous d\'avoir défini VITE_API_BASE_URL dans Vercel.');
  }

  return 'http://localhost:3001';
}

const API_BASE = getApiBaseUrl();

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('jwtToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Attempt automatic refresh token exchange if refresh token exists
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('jwtToken', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        }
      } catch (_) {}
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Erreur HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  createKnowledgeGap: (body: any) =>
    fetch(`${API_BASE}/api/gaps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(r => handleResponse<any>(r)),

  getKnowledgeGaps: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(`${API_BASE}/api/gaps${q}`, {
      headers: getHeaders(),
    }).then(r => handleResponse<any>(r));
  },

  getKnowledgeGapById: (id: string) =>
    fetch(`${API_BASE}/api/gaps/${id}`, {
      headers: getHeaders(),
    }).then(r => handleResponse<any>(r)),

  updateKnowledgeGap: (id: string, updates: any) =>
    fetch(`${API_BASE}/api/gaps/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<any>(r)),

  deleteKnowledgeGap: (id: string) =>
    fetch(`${API_BASE}/api/gaps/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(r => handleResponse<any>(r)),

  addGapComment: (id: string, body: string) =>
    fetch(`${API_BASE}/api/gaps/${id}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ body }),
    }).then(r => handleResponse<any>(r)),

  getGapStats: () =>
    fetch(`${API_BASE}/api/gaps/stats/summary`, {
      headers: getHeaders(),
    }).then(r => handleResponse<any>(r)),

  getMyResolutions: () =>
    fetch(`${API_BASE}/api/notifications/my-resolutions`, {
      headers: getHeaders(),
    }).then(r => handleResponse<any>(r)),

  login: (body: any) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handleResponse<any>(r)),

  login2FA: (body: { temp_token: string; code: string }) =>
    fetch(`${API_BASE}/auth/2fa/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handleResponse<any>(r)),

  register: (body: any) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handleResponse<any>(r)),

  forgotPassword: (email: string) =>
    fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => handleResponse<{ message: string; dev_reset_url?: string; dev_token?: string }>(r)),

  resetPassword: (token: string, password: string) =>
    fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).then(r => handleResponse<{ message: string }>(r)),

  deleteMyAccount: () =>
    fetch(`${API_BASE}/auth/me`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(r => handleResponse<{ message: string }>(r)),

  deleteUser: (email: string) =>
    fetch(`${API_BASE}/admin/users/delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    }).then(r => handleResponse<{ success: boolean; message: string }>(r)),

  setup2FA: () =>
    fetch(`${API_BASE}/auth/2fa/setup`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(r => handleResponse<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>(r)),

  verify2FA: (code: string) =>
    fetch(`${API_BASE}/auth/2fa/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    }).then(r => handleResponse<{ success: boolean; message: string }>(r)),

  disable2FA: (code: string) =>
    fetch(`${API_BASE}/auth/2fa/disable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    }).then(r => handleResponse<{ success: boolean; message: string }>(r)),

  getSecurityLogs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return fetch(`${API_BASE}/audit/security-logs${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    }).then(r => handleResponse<{ items: SecurityLogItem[] }>(r));
  },

  getUsers: () =>
    fetch(`${API_BASE}/admin/users`, {
      headers: getHeaders(),
    }).then(r => handleResponse<{ users: UserRecord[] }>(r)),

  updateUserRole: (email: string, role: string) =>
    fetch(`${API_BASE}/admin/users/role`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, role }),
    }).then(r => handleResponse<{ success: boolean; user: any }>(r)),

  updateUserStatus: (email: string, active: boolean) =>
    fetch(`${API_BASE}/admin/users/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, active }),
    }).then(r => handleResponse<{ success: boolean; user: any }>(r)),

  get: <T>(path: string) =>
    fetch(`${API_BASE}${path}`, { headers: getHeaders() }).then(r => handleResponse<T>(r)),

  post: <T>(path: string, body?: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(r => handleResponse<T>(r)),

  del: (path: string) =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: getHeaders() }).then(r =>
      handleResponse<void>(r)
    ),

  /** Streaming SSE query */
  stream: (
    path: string,
    body: unknown,
    onChunk: (text: string) => void,
    onDone: (payload: { sources: Source[]; latency_ms: number; tokens: number; cached?: boolean }) => void,
    signal?: AbortSignal
  ) => {
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal,
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Erreur serveur');
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              onDone({ sources: data.sources, latency_ms: data.latency_ms, tokens: data.tokens, cached: data.cached });
            } else if (data.text) {
              onChunk(data.text);
            }
          } catch (_) {}
        }
      }
    });
  },

  /** Upload a file via PUT with real-time progress tracking */
  uploadFile: async (file: File, parentId: string | null = null, onProgress?: (pct: number) => void): Promise<void> => {
    const { upload_url } = await api.post<{ upload_url: string; document_id: string }>(
      '/documents/upload-url',
      { filename: file.name, content_type: file.type || 'application/octet-stream', size: file.size, parent_id: parentId }
    );

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', upload_url, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      const token = localStorage.getItem('jwtToken');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Erreur d'upload (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Échec de la connexion réseau lors du téléversement.'));
      xhr.send(file);
    });
  },

  createFolder: async (name: string, parentId: string | null = null): Promise<DocumentItem> => {
    return api.post<DocumentItem>('/documents/folders', { name, parent_id: parentId });
  },

  updateDocument: async (id: string, data: { name?: string; parent_id?: string | null }): Promise<void> => {
    return fetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<void>(r));
  },

  /** Signed URL & File Blob retrieval with client-side session caching */
  getSignedUrl: (documentId: string): Promise<SignedUrlResponse> =>
    fetch(`${API_BASE}/documents/${documentId}/signed-url`, {
      headers: getHeaders(),
    }).then(r => handleResponse<SignedUrlResponse>(r)),

  fetchDocumentBlob: async (documentId: string, signedUrl: string): Promise<Blob> => {
    if (blobCache.has(documentId)) {
      return blobCache.get(documentId)!;
    }
    const res = await fetch(signedUrl);
    if (!res.ok) {
      throw new Error(`Impossible de télécharger le fichier source (${res.status})`);
    }
    const blob = await res.blob();
    blobCache.set(documentId, blob);
    return blob;
  },
};

const blobCache = new Map<string, Blob>();

export interface SignedUrlResponse {
  signed_url: string;
  expires_in: number;
  size_exceeded: boolean;
  document: {
    document_id: string;
    name: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by?: string;
    uploaded_at?: string;
  };
}


// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Source {
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  score: number;
  excerpt: string;
}

export interface DocumentItem {
  document_id: string;
  name: string;
  is_folder: boolean;
  parent_id: string | null;
  size_bytes: number;
  mime_type: string;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  error_message?: string;
  chunk_count: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface StatsData {
  documents: number;
  chunks: number;
  queries_30d: number;
  avg_latency_ms: number;
  queries_by_day: { date: string; count: number }[];
  document_formats?: { pdf: number; docx: number; xlsx: number; text: number; image?: number };
  top_sources?: { name: string; count: number }[];
  success_rate?: number;
  unresolved_rate?: number;
}

export interface QueryHistoryItem {
  query_id: string;
  question: string;
  answer: string;
  latency_ms: number;
  user: string;
  timestamp: string;
  sources: { document_name: string; score: number }[];
}

export interface SecurityLogItem {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface UserRecord {
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'auditor' | 'reader';
  active: boolean;
  created_at: string;
  totp_enabled?: boolean;
}
