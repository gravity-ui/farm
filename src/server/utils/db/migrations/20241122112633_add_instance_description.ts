// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.text('description');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.dropColumn('description');
    });
}
