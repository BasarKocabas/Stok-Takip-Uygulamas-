import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // users
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('role').defaultTo('field_worker');
    table.boolean('is_authorized_creator').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // products
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary();
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.string('unit').notNullable();
    table.decimal('current_stock').defaultTo(0);
    table.decimal('min_stock_level').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // product_cost_history
  await knex.schema.createTable('product_cost_history', (table) => {
    table.uuid('id').primary();
    table.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.decimal('unit_cost').notNullable();
    table.date('effective_date').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // work_orders
  await knex.schema.createTable('work_orders', (table) => {
    table.uuid('id').primary();
    table.string('order_no').unique().notNullable();
    table.string('title').notNullable();
    table.text('description').nullable();
    table.string('client_type').notNullable();
    table.string('status').defaultTo('draft');
    table.string('approval_status').defaultTo('pending');
    table.uuid('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('assigned_to').references('id').inTable('users').onDelete('RESTRICT').nullable();
    table.uuid('approved_by').references('id').inTable('users').onDelete('RESTRICT').nullable();
    table.timestamp('approved_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // work_order_items
  await knex.schema.createTable('work_order_items', (table) => {
    table.uuid('id').primary();
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('RESTRICT');
    table.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.decimal('requested_quantity').notNullable();
    table.decimal('approved_quantity').nullable();
    table.decimal('used_quantity').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // stock_movements
  await knex.schema.createTable('stock_movements', (table) => {
    table.uuid('id').primary();
    table.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('RESTRICT').nullable();
    table.string('movement_type').notNullable();
    table.decimal('quantity').notNullable();
    table.boolean('is_approved').defaultTo(false);
    table.uuid('approved_by').references('id').inTable('users').onDelete('RESTRICT').nullable();
    table.timestamp('approved_at').nullable();
    table.text('notes').nullable();
    table.uuid('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // labor_logs
  await knex.schema.createTable('labor_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('RESTRICT');
    table.uuid('user_id').references('id').inTable('users').onDelete('RESTRICT');
    table.decimal('hours_worked').notNullable();
    table.decimal('hourly_rate').notNullable();
    table.date('date').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // equipment_logs
  await knex.schema.createTable('equipment_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('RESTRICT');
    table.string('equipment_type').notNullable();
    table.text('description').nullable();
    table.text('specs').nullable();
    table.decimal('rental_cost').defaultTo(0);
    table.date('date').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('equipment_logs');
  await knex.schema.dropTableIfExists('labor_logs');
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('work_order_items');
  await knex.schema.dropTableIfExists('work_orders');
  await knex.schema.dropTableIfExists('product_cost_history');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('users');
}
