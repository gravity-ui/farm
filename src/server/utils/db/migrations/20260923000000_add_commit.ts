import type {knexInstance} from '../knex';

type Knex = typeof knexInstance;

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.text('commit');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.dropColumn('commit');
    });
}
