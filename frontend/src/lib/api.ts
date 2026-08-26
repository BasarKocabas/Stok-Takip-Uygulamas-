import axios from 'axios';
import type { User, Product, ProductCostHistory, WorkOrder, StockMovement, DashboardSummary, AuthResponse, LoginInput, PaginatedResponse, Equipment, EquipmentAssignment } from './types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = (error.config?.url ?? '').includes('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data).then(r => r.data),
  register: (data: { name: string; email: string; password: string; role?: string; is_authorized_creator?: boolean }) => api.post<{ user: User }>('/auth/register', data).then(r => r.data),
  me: () => api.get<User>('/auth/me').then(r => r.data),
  updateProfile: (data: { first_name: string; last_name: string; email: string; current_password: string }) =>
    api.put<{ success: boolean }>('/auth/profile', data).then(r => r.data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put<{ success: boolean }>('/auth/password', data).then(r => r.data),
};

// Products
export const productsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) => 
    api.get<PaginatedResponse<Product>>('/products', { params }).then(r => r.data),
  get: (id: string) => api.get<Product & { cost_history: ProductCostHistory[] }>(`/products/${id}`).then(r => r.data),
  getCostHistory: (id: string) => api.get<ProductCostHistory[]>(`/products/${id}/costs`).then(r => r.data),
  getMovements: (id: string) => api.get<StockMovement[]>(`/products/${id}/movements`).then(r => r.data),
  create: (data: Partial<Product> & { initial_cost?: number }) => api.post<Product>('/products', data).then(r => r.data),
  update: (id: string, data: Partial<Product>) => api.put<{ success: boolean }>(`/products/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/products/${id}`).then(r => r.data),
  addCost: (id: string, data: { unit_cost: number; effective_date: string; notes?: string }) => 
    api.post(`/products/${id}/cost`, data).then(r => r.data),
  updateCost: (id: string, costId: string, data: { unit_cost: number; effective_date: string; notes?: string }) =>
    api.put(`/products/${id}/costs/${costId}`, data).then(r => r.data),
  criticalStock: () => api.get<Product[]>('/products/alerts/critical-stock').then(r => r.data),
};

// Work Orders
export const workOrdersApi = {
  list: (params?: { search?: string; status?: string; approval_status?: 'pending' | 'approved' | 'rejected'; client_type?: string; page?: number; limit?: number }) => 
    api.get<PaginatedResponse<WorkOrder>>('/work-orders', { params }).then(r => r.data),
  get: (id: string) => api.get<WorkOrder>(`/work-orders/${id}`).then(r => r.data),
  create: (data: { title: string; description?: string; client_type: string; assigned_to?: string; external_ref?: string }) => 
    api.post<WorkOrder>('/work-orders', data).then(r => r.data),
  update: (id: string, data: Partial<WorkOrder>) => api.put<{ success: boolean }>(`/work-orders/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/work-orders/${id}`).then(r => r.data),
  approve: (id: string) => api.post<{ success: boolean }>(`/work-orders/${id}/approve`).then(r => r.data),
  reject: (id: string) => api.post<{ success: boolean }>(`/work-orders/${id}/reject`).then(r => r.data),
  addItem: (id: string, data: { product_id: string; requested_quantity: number }) => 
    api.post<{ success: boolean }>(`/work-orders/${id}/items`, data).then(r => r.data),
  updateItem: (id: string, itemId: string, data: { approved_quantity?: number; used_quantity?: number }) => 
    api.put<{ success: boolean }>(`/work-orders/${id}/items/${itemId}`, data).then(r => r.data),
  addLabor: (id: string, data: { user_id: string; hours_worked: number; hourly_rate: number; date: string; notes?: string }) => 
    api.post<{ success: boolean }>(`/work-orders/${id}/labor`, data).then(r => r.data),
  addEquipment: (id: string, data: { equipment_type: string; description?: string; specs?: string; rental_cost: number; date: string }) => 
    api.post<{ success: boolean }>(`/work-orders/${id}/equipment`, data).then(r => r.data),
  deleteItem: (id: string, itemId: string) =>
    api.delete<{ success: boolean }>(`/work-orders/${id}/items/${itemId}`).then(r => r.data),
  deleteLabor: (id: string, logId: string) =>
    api.delete<{ success: boolean }>(`/work-orders/${id}/labor/${logId}`).then(r => r.data),
  deleteEquipment: (id: string, logId: string) =>
    api.delete<{ success: boolean }>(`/work-orders/${id}/equipment/${logId}`).then(r => r.data),
  addEquipmentAssignment: (id: string, data: { equipment_id: string; start_date: string; end_date?: string; supplier_name?: string; rate_unit: string; quantity_units?: number; cost: number; notes?: string }) =>
    api.post<{ success: boolean }>(`/work-orders/${id}/equipment-assignments`, data).then(r => r.data),
  updateEquipmentAssignment: (id: string, assignmentId: string, data: { end_date?: string; supplier_name?: string; rate_unit?: string; quantity_units?: number; cost?: number; notes?: string }) =>
    api.put<{ success: boolean }>(`/work-orders/${id}/equipment-assignments/${assignmentId}`, data).then(r => r.data),
  deleteEquipmentAssignment: (id: string, assignmentId: string) =>
    api.delete<{ success: boolean }>(`/work-orders/${id}/equipment-assignments/${assignmentId}`).then(r => r.data),
};

// Stock Movements
export const stockApi = {
  list: (params?: { movement_type?: string; type?: string; product_id?: string; is_approved?: string; page?: number; limit?: number }) => {
    const { type, movement_type, ...rest } = params ?? {};
    return api.get<PaginatedResponse<StockMovement>>('/stock-movements', {
      params: { ...rest, movement_type: movement_type ?? type },
    }).then(r => r.data);
  },
  create: (data: { product_id: string; movement_type?: 'IN' | 'OUT'; type?: 'IN' | 'OUT'; quantity: number; notes?: string; work_order_id?: string; supplier_name?: string; invoice_no?: string }) => 
    api.post<{ success: boolean; message: string }>('/stock-movements', {
      ...data,
      movement_type: data.movement_type || data.type || 'IN',
    }).then(r => r.data),
  approve: (id: string) => api.post<{ success: boolean }>(`/stock-movements/${id}/approve`).then(r => r.data),
};

// Users
export const usersApi = {
  list: (params?: { limit?: number; page?: number; include_inactive?: string }) => api.get<User[]>('/users', { params }).then(r => r.data),
  get: (id: string) => api.get<User>(`/users/${id}`).then(r => r.data),
  update: (id: string, data: Partial<User>) => api.put<{ success: boolean }>(`/users/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/users/${id}`).then(r => r.data),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  recentMovements: () => api.get<StockMovement[]>('/dashboard/recent-movements').then(r => r.data),
  workOrderStats: () => api.get<Record<string, number>>('/dashboard/work-order-stats').then(r => r.data),
};

// Reports
export const reportsApi = {
  stockMovements: (params?: { start_date?: string; end_date?: string }) => 
    api.get('/reports/stock-movements', { params }).then(r => r.data),
  workOrderCosts: (id: string) => api.get(`/reports/work-order-costs/${id}`).then(r => r.data),
  costByClient: (params?: { start_date?: string; end_date?: string }) => 
    api.get('/reports/cost-by-client', { params }).then(r => r.data),
};

// Equipment
export const equipmentApi = {
  list: (params?: { search?: string; status?: string; ownership?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Equipment>>('/equipment', { params }).then(r => r.data),
  mini: () => api.get<Equipment[]>('/equipment/mini').then(r => r.data),
  get: (id: string) => api.get<Equipment & { assignments: EquipmentAssignment[]; total_cost: number }>(`/equipment/${id}`).then(r => r.data),
  create: (data: Partial<Equipment>) => api.post<Equipment>('/equipment', data).then(r => r.data),
  update: (id: string, data: Partial<Equipment>) => api.put<{ success: boolean }>(`/equipment/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/equipment/${id}`).then(r => r.data),
};

export default api;
