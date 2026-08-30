import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_movements', (table) => {
    table.boolean('is_rejected').defaultTo(false);
    table.uuid('rejected_by').nullable().references('id').inTable('users');
    table.timestamp('rejected_at').nullable();
  });
  await knex.schema.alterTable('labor_logs', (table) => {
    table.string('rate_unit').defaultTo('hourly'); // 'hourly' | 'daily'
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_movements', (table) => {
    table.dropColumn('is_rejected');
    table.dropColumn('rejected_by');
    table.dropColumn('rejected_at');
  });
  await knex.schema.alterTable('labor_logs', (table) => {
    table.dropColumn('rate_unit');
  });
}
