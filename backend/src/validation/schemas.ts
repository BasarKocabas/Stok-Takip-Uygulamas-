import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'field_worker']).optional(),
  is_authorized_creator: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'manager', 'field_worker']).optional(),
  is_authorized_creator: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, 'Ad zorunludur'),
  last_name: z.string().min(1, 'Soyad zorunludur'),
  email: z.string().email(),
  current_password: z.string().min(6),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  min_stock_level: z.number().min(0),
  initial_cost: z.number().min(0).optional(),
});

export const productUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  min_stock_level: z.number().min(0).optional(),
});

export const productCostSchema = z.object({
  unit_cost: z.number().positive(),
  effective_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
});

export const workOrderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  client_type: z.enum(['izban', 'belediye', 'kurum_ici', 'diger']),
  assigned_to: z.string().uuid().optional(),
});

export const workOrderUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  client_type: z.enum(['izban', 'belediye', 'kurum_ici', 'diger']).optional(),
  status: z.enum(['draft', 'open', 'in_progress', 'completed', 'cancelled']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const workOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  requested_quantity: z.number().positive(),
});

export const workOrderItemUpdateSchema = z.object({
  approved_quantity: z.number().min(0).optional(),
  used_quantity: z.number().min(0).optional(),
});

export const stockMovementSchema = z.object({
  product_id: z.string().uuid(),
  work_order_id: z.string().uuid().optional(),
  movement_type: z.enum(['IN', 'OUT']),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const laborLogSchema = z.object({
  user_id: z.string().uuid(),
  hours_worked: z.number().positive(),
  hourly_rate: z.number().positive(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
});

export const equipmentLogSchema = z.object({
  equipment_type: z.string().min(1),
  description: z.string().optional(),
  specs: z.string().optional(),
  rental_cost: z.number().min(0),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
});
