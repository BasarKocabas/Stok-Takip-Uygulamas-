import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Equipment catalog table
  await knex.schema.createTable('equipment', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('equipment_type').notNullable();
    table.string('ownership').defaultTo('rented'); // 'owned' | 'rented'
    table.string('status').defaultTo('available'); // 'available' | 'in_use' | 'maintenance'
    table.text('specs').nullable();
    table.string('serial_or_plate_no').nullable();
    table.string('default_supplier_name').nullable();
    table.string('default_rate_unit').nullable(); // 'hourly' | 'daily' | 'fixed'
    table.decimal('default_rate_cost').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Equipment assignments table (replaces equipment_logs for new data)
  await knex.schema.createTable('equipment_assignments', (table) => {
    table.uuid('id').primary();
    table.uuid('equipment_id').references('id').inTable('equipment').onDelete('RESTRICT');
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').nullable(); // NULL = still in use
    table.string('supplier_name').nullable();
    table.string('rate_unit').defaultTo('daily'); // 'hourly' | 'daily' | 'fixed'
    table.decimal('quantity_units').nullable(); // hours/days count (null for fixed)
    table.decimal('cost').defaultTo(0);
    table.text('notes').nullable();
    table.uuid('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. Index for faster lookups
  await knex.schema.alterTable('equipment_assignments', (table) => {
    table.index(['equipment_id']);
    table.index(['work_order_id']);
  });

  // 4. Data migration: create catalog entries from distinct equipment_types
  const distinctTypes = await knex('equipment_logs')
    .distinct('equipment_type')
    .whereNotNull('equipment_type');

  const { v4: uuidv4 } = await import('uuid');

  const catalogMap: Record<string, string> = {};
  for (const row of distinctTypes) {
    const id = uuidv4();
    catalogMap[row.equipment_type] = id;
    await knex('equipment').insert({
      id,
      name: row.equipment_type,
      equipment_type: row.equipment_type,
      ownership: 'rented',
      status: 'available',
      default_rate_unit: 'fixed',
      is_active: true,
    });
  }

  // 5. Data migration: convert equipment_logs to equipment_assignments
  const logs = await knex('equipment_logs').select('*');
  for (const log of logs) {
    const equipmentId = catalogMap[log.equipment_type];
    if (!equipmentId) continue;

    // Get work order creator as fallback for created_by
    const wo = await knex('work_orders').where({ id: log.work_order_id }).first();

    await knex('equipment_assignments').insert({
      id: uuidv4(),
      equipment_id: equipmentId,
      work_order_id: log.work_order_id,
      start_date: log.date,
      end_date: log.date, // Closed (historical record)
      supplier_name: null,
      rate_unit: 'fixed', // Old data has no unit breakdown
      quantity_units: null,
      cost: log.rental_cost || 0,
      notes: [log.description, log.specs, log.notes].filter(Boolean).join(' — ') || null,
      created_by: wo?.created_by || null,
    });
  }

  // Note: equipment_logs table is preserved for rollback safety
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('equipment_assignments');
  await knex.schema.dropTableIfExists('equipment');
}
