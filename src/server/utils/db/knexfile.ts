import path from 'path';

// eslint-disable-next-line no-restricted-imports
import type {Knex} from 'knex';

import type {NodeEnv} from '../../../shared/types';

const commonSettings = {
    client: 'sqlite3',
    /**
     * sqlite does not support inserting default values.
     * Set the `useNullAsDefault` flag to hide this warning.
     * (see docs https://knexjs.org/guide/query-builder.html#insert).
     */
    useNullAsDefault: true,
    connection: {
        filename: process.env.FARM_DB_FILE_PATH || path.resolve(__dirname, '../../../../farm.db'),
    },
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

/**
 * WARNING
 * Should be synced with <project_path>/knexfile.js
 */
const config: Record<NodeEnv, Knex.Config> = {
    development: {
        ...commonSettings,
    },
    production: {
        ...commonSettings,
    },
    test: {
        ...commonSettings,
    },
};

export default config;
