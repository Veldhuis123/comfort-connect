// API Configuration
// In development: proxy via Vite, in production: via environment variable
export const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  uploadQuotePhotos: async (quoteId: number, photos: { file: File; category: string }[]) => {
    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo.file);
    });
    // Use first photo's category or 'general'
    formData.append('category', photos[0]?.category || 'general');
    
    const response = await fetch(`${API_URL}/upload/quote/${quoteId}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    return response.json();
  },
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

  // Products (universal)
  getProducts: (category?: string) =>
    apiRequest<Product[]>(`/products${category ? `?category=${category}` : ''}`),
  getProduct: (id: string) => apiRequest<Product>(`/products/${id}`),
  getAdminProducts: (category?: string) =>
    apiRequest<Product[]>(`/products/admin/all${category ? `?category=${category}` : ''}`),
  createProduct: (product: CreateProduct) =>
    apiRequest<{ id: string }>('/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id: string, product: Partial<CreateProduct>) =>
    apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) }),
  deleteProduct: (id: string) =>
    apiRequest(`/products/${id}`, { method: 'DELETE' }),
  toggleProductActive: (id: string) =>
    apiRequest<{ is_active: boolean }>(`/products/${id}/toggle`, { method: 'PATCH' }),
  uploadProductImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/products/${id}/image`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Upload mislukt');
    return response.json() as Promise<{ image_url: string }>;
  },
  deleteProductImage: (id: string) =>
    apiRequest(`/products/${id}/image`, { method: 'DELETE' }),
  updateProductSort: (products: { id: string; sort_order: number }[]) =>
    apiRequest('/products/sort', { method: 'PATCH', body: JSON.stringify({ products }) }),
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

// Product types
export type ProductCategory = 
  | 'airco' 
  | 'unifi_router' 
  | 'unifi_switch' 
  | 'unifi_accesspoint' 
  | 'unifi_camera' 
  | 'battery' 
  | 'charger'
  | 'solar';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  base_price: number;
  image_url: string | null;
  specs: Record<string, unknown>;
  features: string[];
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProduct {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  base_price: number;
  description?: string;
  specs?: Record<string, unknown>;
  features?: string[];
  is_active?: boolean;
  sort_order?: number;
}
