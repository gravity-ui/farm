import {getNodeKit} from '../../components/node-kit';
import * as db from '../../utils/db';
import {wrapInternalError} from '../common';

import {BUILDS_LIMIT} from './constants';
import {deleteInstance, generateInstance} from './utils';

export class Queue {
    declare private locker: {
        deleteInstances: boolean;
        buildInstances: boolean;
    };

    constructor() {
        this.locker = {
            deleteInstances: false,
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
