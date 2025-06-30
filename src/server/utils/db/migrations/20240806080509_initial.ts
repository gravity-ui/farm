// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('instances', (table) => {
        table.text('hash').notNullable().unique().primary();

        table.text('project').notNullable();
        table.text('branch').notNullable();
        table.text('status').notNullable();
        table.text('instance_config_name').notNullable();
        table.text('created').notNullable();
        table.text('vcs').notNullable();
        table.text('launched').notNullable();
        table.text('env_variables');
        table.text('url_template');
    });

    await knex.schema.createTable('instance_build_logs', (table) => {
        table.increments('id').primary();
        table.text('hash');
        table.foreign('hash').references('instances.hash');

        table.text('stdout');
        table.text('stderr');
        table.text('command');
        table.integer('duration');
        table.integer('code');
        table.text('created');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('instance_build_logs');
    await knex.schema.dropTableIfExists('instances');
}
