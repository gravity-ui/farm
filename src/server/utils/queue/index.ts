import ms from 'ms';

import {getNodeKit} from '../../components/node-kit';
import {wrapInternalError} from '../common';

import {Queue} from './queue';

const INTERVAL = ms('30s');
const queue = new Queue();

const runQueue = async () => {
    await Promise.all([
        // 1. Delete instances
        queue.deleteInstances(),

        // 2. Build instances
        queue.buildInstances(),
    ]).catch((e) => {
        getNodeKit().ctx.logError('QUEUE::runQueue', wrapInternalError(e));
    });
};

export const start = () => {
    setInterval(() => runQueue(), INTERVAL);
};
