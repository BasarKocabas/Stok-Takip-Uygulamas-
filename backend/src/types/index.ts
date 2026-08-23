export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'field_worker';
  is_authorized_creator: boolean;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ProductCostHistory {
  id: string;
  product_id: string;
  unit_cost: number;
  effective_date: string | Date;
  notes?: string;
  created_at: string | Date;
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
  approved_at?: string | Date;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  product_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  used_quantity: number;
  created_at: string | Date;
}

export interface StockMovement {
  id: string;
  product_id: string;
  work_order_id?: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string | Date;
  notes?: string;
  created_by: string;
  created_at: string | Date;
}

export interface LaborLog {
  id: string;
  work_order_id: string;
  user_id: string;
  hours_worked: number;
  hourly_rate: number;
  date: string | Date;
  notes?: string;
  created_at: string | Date;
}

export interface EquipmentLog {
  id: string;
  work_order_id: string;
  equipment_type: string;
  description?: string;
  specs?: string;
  rental_cost: number;
  date: string | Date;
  notes?: string;
  created_at: string | Date;
}
