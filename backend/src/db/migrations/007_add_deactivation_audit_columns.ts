import type { Knex } from 'knex';

export const config = { transaction: false };

const TABLES = ['users', 'products', 'work_orders', 'equipment'];

export async function up(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');
  for (const t of TABLES) {
    await knex.schema.alterTable(t, (table) => {
      table.uuid('deactivated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('deactivated_at').nullable();
    });
  }
  await knex.raw('PRAGMA foreign_keys = ON');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');
  for (const t of TABLES) {
    await knex.schema.alterTable(t, (table) => {
      table.dropColumn('deactivated_by');
      table.dropColumn('deactivated_at');
    });
  }
  await knex.raw('PRAGMA foreign_keys = ON');
}
