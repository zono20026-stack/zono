const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${API_URL}/api/v1`;

export const getAuthToken = (): string | null => {
  return localStorage.getItem('easy_send_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('easy_send_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('easy_send_token');
  localStorage.removeItem('easy_send_user');
};

export const getSavedUser = () => {
  const u = localStorage.getItem('easy_send_user');
  return u ? JSON.parse(u) : null;
};

export const saveUser = (user: any) => {
  localStorage.setItem('easy_send_user', JSON.stringify(user));
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      removeAuthToken();
      window.dispatchEvent(new Event('easy_send_auth_expired'));
    }
    throw new Error(data.message || `خطأ في الطلب (${response.status})`);
  }

  return data;
};
