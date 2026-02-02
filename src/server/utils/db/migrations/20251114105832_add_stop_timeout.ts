// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.integer('stop_timeout');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.dropColumn('stop_timeout');
    });
}
