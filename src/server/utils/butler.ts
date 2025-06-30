import ms from 'ms';

import type {Instance} from '../../shared/common';
import {getFarmProvider} from '../components/farm-provider';
import {getNodeKit} from '../components/node-kit';

import {getGlobalFarmConfig, wrapInternalError} from './common';
import * as db from './db';
import * as instanceUtils from './instance';

const Locker = {
    stopInstances: false,
    deleteInstances: false,
};

const instanceStopTimeout = getGlobalFarmConfig().instanceStopTimeout ?? ms('1h');
const instanceDeleteTimeout = getGlobalFarmConfig().instanceDeleteTimeout;

export const isTimeout = (now: number, time: number, timeout: number) => {
    const diff = now - time;
    if (Number.isNaN(diff)) {
        return true;
    }

    return diff > timeout;
};

const stopInstances = async () => {
    if (instanceStopTimeout === 0 || Locker.stopInstances) {
        return;
    }

    try {
        Locker.stopInstances = true;
        const instancesToStop: Instance[] = [];

        const now = Date.now();
        const instances = await getFarmProvider().getInstances();

        const runningInstances = instances.filter((p) => p.status === 'running');
        for (const process of runningInstances) {
            const instance = await db.getInstance(process.hash);

            // if `instanceStopTimeout` < building time: then will call `stopInstance` before finishing build.
            if (
                instance?.status === 'generated' &&
                isTimeout(now, Number(process.startTime), instanceStopTimeout)
            ) {
                instancesToStop.push(instance);
            }
        }

        await Promise.all(
            instancesToStop.map((instance) =>
                instanceUtils
                    .stopInstance(instance.hash)
                    .catch(() => console.warn(`error while stopping instance "${instance.hash}"`)),
            ),
        );
    } catch (e: any) {
        getNodeKit().ctx.logError('Butler', wrapInternalError(e));
    } finally {
        Locker.stopInstances = false;
    }
};

const deleteInstancesByTTL = async () => {
    if (!instanceDeleteTimeout || Locker.deleteInstances) {
        return;
    }

    try {
        Locker.deleteInstances = true;

        const instancesToDelete = await db.getInstancesByTTL(instanceDeleteTimeout);

        await Promise.all(
            instancesToDelete.map((instance) =>
                instanceUtils
                    .addInstanceToDeleteQueue(instance)
                    .catch(() => console.warn(`error while deleting instance "${instance.hash}"`)),
            ),
        );
    } catch (e: any) {
        getNodeKit().ctx.logError('Butler', wrapInternalError(e));
    } finally {
        Locker.deleteInstances = false;
    }
};

const INTERVAL = ms('5m');

export const start = () => setInterval(() => [stopInstances(), deleteInstancesByTTL()], INTERVAL);
