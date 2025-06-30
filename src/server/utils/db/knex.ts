// eslint-disable-next-line no-restricted-imports
import {knex} from 'knex';

import {NodeEnv} from '../../../shared/types';

import knexConfig from './knexfile';

const environment: NodeEnv = Object.values<string>(NodeEnv).includes(process.env.NODE_ENV || '')
    ? (process.env.NODE_ENV as NodeEnv)
    : NodeEnv.Development;

const config = knexConfig[environment];

export const knexInstance = knex(config);
