import type {knexInstance} from '../knex';

type Knex = typeof knexInstance;

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.string('last_activity_at');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('instances', (table) => {
        table.dropColumn('last_activity_at');
    });
}
