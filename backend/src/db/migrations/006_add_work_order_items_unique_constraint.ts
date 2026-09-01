import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('work_order_items', (table) => {
    table.unique(['work_order_id', 'product_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('work_order_items', (table) => {
    table.dropUnique(['work_order_id', 'product_id']);
  });
}
