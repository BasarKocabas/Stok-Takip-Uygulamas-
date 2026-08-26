import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add external_ref to work_orders
  await knex.schema.alterTable('work_orders', (table) => {
    table.string('external_ref').nullable();
  });

  // Add supplier_name and invoice_no to stock_movements
  await knex.schema.alterTable('stock_movements', (table) => {
    table.string('supplier_name').nullable();
    table.string('invoice_no').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('work_orders', (table) => {
    table.dropColumn('external_ref');
  });
  await knex.schema.alterTable('stock_movements', (table) => {
    table.dropColumn('supplier_name');
    table.dropColumn('invoice_no');
  });
}
