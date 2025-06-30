// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.dropColumn('launched');
    });
}

export async function down(knex: Knex): Promise<void> {
    const defaultLaunched = String(Date.now());

    await knex.schema.table('instances', (table) => {
        table.text('launched').notNullable().defaultTo(defaultLaunched);
    });

    await knex.schema.alterTable('instances', (table) => {
        table.text('launched').notNullable().alter();
    });
}
