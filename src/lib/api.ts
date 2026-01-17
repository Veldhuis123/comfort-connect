// API Configuration
// Pas deze URL aan naar je eigen server
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Auth token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
};

// API request helper
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Server fout' }));
    throw new Error(error.error || 'Er is iets misgegaan');
  }

  return response.json();
};

// API endpoints
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  getMe: () => apiRequest<AdminUser>('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Reviews
  getPublicReviews: () => apiRequest<Review[]>('/reviews'),
  getAdminReviews: () => apiRequest<Review[]>('/reviews/admin'),
  createReview: (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) =>
    apiRequest('/reviews', { method: 'POST', body: JSON.stringify(review) }),
  updateReview: (id: number, review: Partial<Review>) =>
    apiRequest(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(review) }),
  deleteReview: (id: number) =>
    apiRequest(`/reviews/${id}`, { method: 'DELETE' }),
  toggleReviewVisibility: (id: number) =>
    apiRequest(`/reviews/${id}/toggle`, { method: 'PATCH' }),

  // Quotes
  getQuotes: (status?: string) =>
    apiRequest<QuoteRequest[]>(`/quotes${status ? `?status=${status}` : ''}`),
  getQuote: (id: number) => apiRequest<QuoteRequest>(`/quotes/${id}`),
  createQuote: (quote: CreateQuoteRequest) =>
    apiRequest<{ id: number }>('/quotes', { method: 'POST', body: JSON.stringify(quote) }),
  updateQuoteStatus: (id: number, status: string, admin_notes?: string) =>
    apiRequest(`/quotes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_notes }),
    }),
  deleteQuote: (id: number) =>
    apiRequest(`/quotes/${id}`, { method: 'DELETE' }),
  getQuoteStats: () => apiRequest<QuoteStats>('/quotes/stats/summary'),

  // Contact
  getMessages: (unread?: boolean) =>
    apiRequest<ContactMessage[]>(`/contact${unread ? '?unread=true' : ''}`),
  getMessage: (id: number) => apiRequest<ContactMessage>(`/contact/${id}`),
  createMessage: (message: CreateContactMessage) =>
    apiRequest('/contact', { method: 'POST', body: JSON.stringify(message) }),
  markAsReplied: (id: number) =>
    apiRequest(`/contact/${id}/replied`, { method: 'PATCH' }),
  deleteMessage: (id: number) =>
    apiRequest(`/contact/${id}`, { method: 'DELETE' }),
  getUnreadCount: () => apiRequest<{ unread: number }>('/contact/stats/unread'),

  // Airco
  getPublicAircos: () => apiRequest<AircoUnit[]>('/airco'),
  getAdminAircos: () => apiRequest<AircoUnit[]>('/airco/admin'),
  createAirco: (airco: AircoUnit) =>
    apiRequest('/airco', { method: 'POST', body: JSON.stringify(airco) }),
  updateAirco: (id: string, airco: Partial<AircoUnit>) =>
    apiRequest(`/airco/${id}`, { method: 'PUT', body: JSON.stringify(airco) }),
  deleteAirco: (id: string) =>
    apiRequest(`/airco/${id}`, { method: 'DELETE' }),
  toggleAircoActive: (id: string) =>
    apiRequest(`/airco/${id}/toggle`, { method: 'PATCH' }),
};

// Types
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'moderator';
}

export interface Review {
  id: number;
  name: string;
  location: string;
  rating: number;
  review_text: string;
  service: string;
  review_date: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  rooms: string;
  total_size: number;
  total_capacity: number;
  selected_airco_id: string | null;
  selected_airco_name: string | null;
  selected_airco_brand: string | null;
  estimated_price: number | null;
  pipe_color: string;
  pipe_length: number | null;
  additional_notes: string | null;
  status: 'nieuw' | 'in_behandeling' | 'offerte_verstuurd' | 'akkoord' | 'afgewezen' | 'voltooid';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  photos?: QuotePhoto[];
}

export interface QuotePhoto {
  id: number;
  quote_request_id: number;
  category: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export interface CreateQuoteRequest {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  rooms: Array<{ name: string; size: string; ceilingHeight: string; type: string }>;
  total_size: number;
  total_capacity: number;
  selected_airco_id?: string;
  selected_airco_name?: string;
  selected_airco_brand?: string;
  estimated_price?: number;
  pipe_color: string;
  pipe_length?: number;
  additional_notes?: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  replied_at: string | null;
  created_at: string;
}

export interface CreateContactMessage {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface AircoUnit {
  id: string;
  name: string;
  brand: string;
  capacity: string;
  min_m2: number;
  max_m2: number;
  base_price: number;
  image_url: string | null;
  features: string[];
  energy_label: string;
  is_active: boolean;
  sort_order: number;
}

export interface QuoteStats {
  total: number;
  thisMonth: number;
  byStatus: Record<string, number>;
}
