import path from 'path';

// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

import type {NodeEnv} from '../../../shared/types';

const DB_TYPE = process.env.FARM_DB_TYPE || 'sqlite';

const getCommonSettings = (): Knex.Config => {
    const baseSettings = {
        migrations: {
            directory: path.resolve(__dirname, './migrations'),
            tableName: 'knex_migrations',
            extension: 'ts',
        },
        seeds: {
            directory: path.resolve(__dirname, './seeds'),
            extension: 'ts',
        },
    };

    if (DB_TYPE === 'postgres') {
        return {
            ...baseSettings,
            client: 'pg',
            connection: {
                host: process.env.FARM_DB_HOST || 'localhost',
                port: parseInt(process.env.FARM_DB_PORT || '5432', 10),
                user: process.env.FARM_DB_USER || 'postgres',
                password: process.env.FARM_DB_PASSWORD || 'postgres',
                database: process.env.FARM_DB_NAME || 'farm',
            },
        };
    }

    // Default to SQLite
    return {
        ...baseSettings,
        client: 'sqlite3',
        /**
         * sqlite does not support inserting default values.
         * Set the `useNullAsDefault` flag to hide this warning.
         * (see docs https://knexjs.org/guide/query-builder.html#insert).
         */
        useNullAsDefault: true,
        connection: {
            filename:
                process.env.FARM_DB_FILE_PATH || path.resolve(__dirname, '../../../../farm.db'),
        },
    };
};

/**
 * WARNING
 * Should be synced with <project_path>/knexfile.js
 */
const config: Record<NodeEnv, Knex.Config> = {
    development: getCommonSettings(),
    production: getCommonSettings(),
    test: getCommonSettings(),
};

export default config;
