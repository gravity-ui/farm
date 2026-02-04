// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('instances', (table) => {
        table.integer('build_restart_count').notNullable().defaultTo(0);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('instances', (table) => {
        table.dropColumn('build_restart_count');
    });
}
