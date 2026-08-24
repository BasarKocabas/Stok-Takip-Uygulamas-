import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  const usersCount = await knex('users').count('* as count').first();
  if (usersCount && Number(usersCount.count) > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Deletes ALL existing entries
  await knex('equipment_logs').del();
  await knex('labor_logs').del();
  await knex('stock_movements').del();
  await knex('work_order_items').del();
  await knex('work_orders').del();
  await knex('product_cost_history').del();
  await knex('products').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminId = uuidv4();
  const managerId = uuidv4();
  const workerId = uuidv4();

  await knex('users').insert([
    { id: adminId, name: 'Barış', email: 'admin@ansava.com', password_hash: passwordHash, role: 'admin', is_authorized_creator: true },
    { id: managerId, name: 'Veysel', email: 'manager@ansava.com', password_hash: passwordHash, role: 'manager', is_authorized_creator: true },
    { id: workerId, name: 'Mustafa', email: 'worker@ansava.com', password_hash: passwordHash, role: 'field_worker', is_authorized_creator: false },
  ]);

  const p1 = uuidv4();
  const p2 = uuidv4();
  const p3 = uuidv4();
  const p4 = uuidv4();
  const p5 = uuidv4();

  await knex('products').insert([
    { id: p1, code: 'PRD-001', name: 'Çelik Boru', unit: 'metre', current_stock: 100, min_stock_level: 20 },
    { id: p2, code: 'PRD-002', name: 'Alüminyum Profil', unit: 'metre', current_stock: 50, min_stock_level: 10 },
    { id: p3, code: 'PRD-003', name: 'Sac Levha', unit: 'adet', current_stock: 200, min_stock_level: 50 },
    { id: p4, code: 'PRD-004', name: 'Bakır Kablo 80V', unit: 'metre', current_stock: 500, min_stock_level: 100 },
    { id: p5, code: 'PRD-005', name: 'Cıvata M10', unit: 'adet', current_stock: 1000, min_stock_level: 200 },
  ]);

  await knex('product_cost_history').insert([
    { id: uuidv4(), product_id: p1, unit_cost: 45.5, effective_date: '2024-01-01' },
    { id: uuidv4(), product_id: p2, unit_cost: 30.0, effective_date: '2024-01-01' },
    { id: uuidv4(), product_id: p3, unit_cost: 120.0, effective_date: '2024-01-01' },
    { id: uuidv4(), product_id: p4, unit_cost: 15.0, effective_date: '2024-01-01' },
    { id: uuidv4(), product_id: p5, unit_cost: 2.5, effective_date: '2024-01-01' },
  ]);

  const wo1 = uuidv4();
  const wo2 = uuidv4();

  await knex('work_orders').insert([
    { id: wo1, order_no: 'IE-2024-001', title: 'İZBAN Hat Bakımı', description: 'Hat bakım onarım', client_type: 'izban', status: 'in_progress', approval_status: 'approved', created_by: managerId, assigned_to: workerId, approved_by: adminId, approved_at: knex.fn.now() },
    { id: wo2, order_no: 'IE-2024-002', title: 'Belediye Park Düzenleme', description: 'Park düzenlemesi', client_type: 'belediye', status: 'open', approval_status: 'pending', created_by: managerId, assigned_to: workerId },
  ]);

  await knex('work_order_items').insert([
    { id: uuidv4(), work_order_id: wo1, product_id: p1, requested_quantity: 10, approved_quantity: 10, used_quantity: 5 },
    { id: uuidv4(), work_order_id: wo1, product_id: p4, requested_quantity: 50, approved_quantity: 50, used_quantity: 20 },
  ]);

  await knex('stock_movements').insert([
    { id: uuidv4(), product_id: p1, movement_type: 'IN', quantity: 100, is_approved: true, created_by: adminId },
    { id: uuidv4(), product_id: p1, work_order_id: wo1, movement_type: 'OUT', quantity: 10, is_approved: true, approved_by: adminId, approved_at: knex.fn.now(), created_by: workerId },
  ]);

  await knex('labor_logs').insert([
    { id: uuidv4(), work_order_id: wo1, user_id: workerId, hours_worked: 8, hourly_rate: 200, date: '2024-01-10' },
  ]);

  await knex('equipment_logs').insert([
    { id: uuidv4(), work_order_id: wo1, equipment_type: 'Ekskavatör', rental_cost: 1500, date: '2024-01-10' },
  ]);

  // Kritik stok demosu: Sac Levha minimumun altına
  await knex('products').where({ id: p3 }).update({ current_stock: 30 }); // min 50

  // Canlı onay demosu: bekleyen çıkış talebi
  await knex('stock_movements').insert({
    id: uuidv4(), product_id: p4, work_order_id: wo1,
    movement_type: 'OUT', quantity: 20, is_approved: false, created_by: workerId,
  });
}
