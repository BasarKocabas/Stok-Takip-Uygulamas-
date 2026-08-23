import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const add = (t: string, c: string[]) => knex.schema.alterTable(t, (x) => x.index(c));
  await add('stock_movements', ['product_id']);
  await add('stock_movements', ['work_order_id']);
  await add('stock_movements', ['is_approved']);
  await add('work_order_items', ['work_order_id']);
  await add('work_order_items', ['product_id']);
  await add('product_cost_history', ['product_id', 'effective_date']);
  await add('labor_logs', ['work_order_id']);
  await add('equipment_logs', ['work_order_id']);
  await add('work_orders', ['status']);
  await add('work_orders', ['approval_status']);
}

export async function down(knex: Knex): Promise<void> {
  const drop = (t: string, c: string[]) => knex.schema.alterTable(t, (x) => x.dropIndex(c));
  await drop('work_orders', ['approval_status']);
  await drop('work_orders', ['status']);
  await drop('equipment_logs', ['work_order_id']);
  await drop('labor_logs', ['work_order_id']);
  await drop('product_cost_history', ['product_id', 'effective_date']);
  await drop('work_order_items', ['product_id']);
  await drop('work_order_items', ['work_order_id']);
  await drop('stock_movements', ['is_approved']);
  await drop('stock_movements', ['work_order_id']);
  await drop('stock_movements', ['product_id']);
}
