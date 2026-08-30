export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'field_worker';
  is_authorized_creator: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_cost?: number;
}

export interface ProductCostHistory {
  id: string;
  product_id: string;
  unit_cost: number;
  effective_date: string;
  notes?: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  order_no: string;
  title: string;
  description?: string;
  client_type: 'izban' | 'belediye' | 'kurum_ici' | 'diger';
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  approval_status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  assigned_to?: string;
  approved_by?: string;
  approved_at?: string;
  external_ref?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  assignee_name?: string;
  items?: WorkOrderItem[];
  labor_logs?: LaborLog[];
  equipment_logs?: EquipmentLog[];
  equipment_assignments?: EquipmentAssignment[];
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  product_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  used_quantity: number;
  created_at: string;
  product_name?: string;
  product_code?: string;
  product_unit?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  work_order_id?: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  supplier_name?: string;
  invoice_no?: string;
  created_by: string;
  created_at: string;
  product_name?: string;
  product_code?: string;
  creator_name?: string;
  approver_name?: string;
  is_rejected?: boolean;
  rejected_by?: string;
  rejected_at?: string;
}

export interface LaborLog {
  id: string;
  work_order_id: string;
  user_id: string;
  hours_worked: number;
  hourly_rate: number;
  date: string;
  notes?: string;
  created_at: string;
  user_name?: string;
  rate_unit?: 'hourly' | 'daily';
}

export interface EquipmentLog {
  id: string;
  work_order_id: string;
  equipment_type: string;
  description?: string;
  specs?: string;
  rental_cost: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  ownership: 'owned' | 'rented';
  status: 'available' | 'in_use' | 'maintenance';
  specs?: string;
  serial_or_plate_no?: string;
  default_supplier_name?: string;
  default_rate_unit?: 'hourly' | 'daily' | 'fixed';
  default_rate_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentAssignment {
  id: string;
  equipment_id: string;
  work_order_id: string;
  start_date: string;
  end_date?: string;
  supplier_name?: string;
  rate_unit: 'hourly' | 'daily' | 'fixed';
  quantity_units?: number;
  cost: number;
  notes?: string;
  created_by: string;
  created_at: string;
  equipment_name?: string;
  equipment_type?: string;
  ownership?: string;
  serial_or_plate_no?: string;
  creator_name?: string;
  order_no?: string;
  work_order_title?: string;
}

export interface DashboardSummary {
  total_products: number;
  total_stock_value: number;
  open_work_orders: number;
  critical_stock_count: number;
  pending_approvals: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
