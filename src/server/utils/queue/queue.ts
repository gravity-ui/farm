import {getNodeKit} from '../../components/node-kit';
import * as db from '../../utils/db';
import {wrapInternalError} from '../common';

import {BUILDS_LIMIT} from './constants';
import {
    deleteInstance,
    generateInstance,
    getInstancesToRestart,
    restartFailedBuilds,
} from './utils';

export class Queue {
    declare private locker: {
        deleteInstances: boolean;
        restartFailedBuilds: boolean;
        buildInstances: boolean;
    };

    constructor() {
        this.locker = {
            deleteInstances: false,
            restartFailedBuilds: false,
            buildInstances: false,
        };
    }

    deleteInstances = async () => {
        if (this.locker.deleteInstances) {
            return;
        }

        try {
            this.locker.deleteInstances = true;
            const instancesToDelete = await db.getInstancesByStatus({status: 'deleting'});

            await Promise.all(
                instancesToDelete.map((build) =>
                    deleteInstance(build).catch((e) => {
                        getNodeKit().ctx.logError('QUEUE::deleteInstances', wrapInternalError(e));
                    }),
                ),
            );
        } finally {
            this.locker.deleteInstances = false;
        }
    };

    restartFailedBuilds = async () => {
        if (this.locker.restartFailedBuilds) {
            return;
        }

        try {
            this.locker.restartFailedBuilds = true;
            const instancesToRestart = await getInstancesToRestart();

            if (instancesToRestart.length > 0) {
                restartFailedBuilds(instancesToRestart).catch((e) => {
                    getNodeKit().ctx.logError('QUEUE::restartFailedBuilds', wrapInternalError(e));
                });
            }
        } catch (e) {
            getNodeKit().ctx.logError('QUEUE::restartFailedBuilds', wrapInternalError(e));
        } finally {
            this.locker.restartFailedBuilds = false;
        }
    };

    buildInstances = async () => {
        if (this.locker.buildInstances) {
            return;
        }

        try {
            this.locker.buildInstances = true;

            const count = await db.countGeneratingInstances();
            const free = BUILDS_LIMIT - count;

            if (free > 0) {
                const generateBuilds = await db.getInstancesByStatus({
                    status: 'queued',
                    limit: free,
                });

                generateBuilds.forEach((j) => {
                    generateInstance(j).catch((e) => {
                        getNodeKit().ctx.logError('QUEUE::buildInstances', wrapInternalError(e));
                    });
                });
            }
        } finally {
            this.locker.buildInstances = false;
        }
    };
}
