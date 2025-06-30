import type {AppContext} from '@gravity-ui/nodekit';
import {Observable} from 'observable-fns';

import type {Instance} from '../../../shared/common';
import {getServerApp} from '../../app';
import {getFarmProvider} from '../../components/farm-provider';
import type {GenerateInstanceData, InstanceObservableEmitValue} from '../../models/common';
import * as db from '../../utils/db';
import {formatError} from '../common';
import {addInstanceToGenerateQueue} from '../instance';
import type {Stats} from '../stats';
import {sendStats} from '../stats';

const prepareSendStats = (data: Instance, ctx: AppContext) => {
    const start = Date.now();

    return function (step: string) {
        const now = Date.now();
        const stats: Stats = {
            timestamp: now,
            action: 'GENERATE_INSTANCE',
            requestTime: now - start,
            requestMethod: '-',
            requestUrl: '-',
            hash: data.hash,
            responseStatus: 418,
            step,
        };

        sendStats(stats, ctx);
    };
};

const buildInstance = ({
    sendBuildStats,
    instance,
}: {
    sendBuildStats: (step: string) => void;
    instance: GenerateInstanceData;
}) => {
    return new Promise<void>((resolve) => {
        const observable = new Observable<InstanceObservableEmitValue>((observer) => {
            getFarmProvider()
                .buildInstance(instance, observer)
                .catch((err) => {
                    observer.error(err);
                })
                .finally(() => {
                    observer.complete();
                });
        });

        observable.subscribe({
            next: async ({output, config}) => {
                if (output && output.length > 0) {
                    await db.insertInstanceLogs(instance.hash, output);

                    // TODO(golbahsg): Why only one?
                    const [log] = output;
                    if (log.duration && log.command) {
                        sendBuildStats(log.command);
                    }
                }

                if (config?.status) {
                    await db.updateInstanceStatus(instance.hash, config.status);
                }
            },
            error: async (e) => {
                await db
                    .insertInstanceLogs(instance.hash, [
                        {
                            command: e.command || 'Build failed',
                            stdout: e.stdout || '',
                            code: -1,
                            duration: 0,
                            stderr: formatError(e),
                        },
                    ])
                    .catch(console.log);

                await db.updateInstanceStatus(instance.hash, 'errored');
                sendBuildStats('BUILD_ERRORED');
            },
            complete: () => {
                resolve();
            },
        });
    });
};

/**
 * Generate instance
 */
export const generateInstance = async (instance: Instance) => {
    const ctx = getServerApp().nodekit.ctx.create(instance.hash);
    const sendBuildStats = prepareSendStats(instance, ctx);

    try {
        await db.clearInstanceBuildLogs(instance.hash);
        await db.updateInstanceStatus(instance.hash, 'generating');

        await buildInstance({
            sendBuildStats,
            instance,
        });
    } catch (e) {
        db.insertInstanceLogs(instance.hash, [
            {
                command: 'Build failed',
                // @ts-expect-error e is any
                stdout: e.stdout || '',
                code: -1,
                duration: 0,
                stderr: formatError(e),
            },
        ]).catch(console.log);

        db.updateInstanceStatus(instance.hash, 'errored').catch(console.log);

        throw e;
    } finally {
        ctx.end();
    }
};

/**
 * Delete instance
 *
 * calls `farmProvider.deleteInstance` and `clearInstanceData` in database
 */
export const deleteInstance = async (instance: Instance) => {
    await getFarmProvider().deleteInstance(instance.hash);
    await db.clearInstanceData(instance.hash);
};

export const getInstancesToRestart = async () => {
    const generatingInstances = await db.getInstancesByStatus({status: 'generating'});
    const instances = await getFarmProvider().getInstances();

    const instancesToRestart: Instance[] = [];
    generatingInstances.forEach((instance) => {
        const item = instances.find((p) => p.hash === instance.hash);
        // Provider creates new process right before starting the app, so we need to restart only errored instances here.
        if (item?.status === 'errored') {
            instancesToRestart.push(instance);
        }
    });

    return instancesToRestart;
};

export const restartFailedBuilds = async (instances: Instance[]) => {
    await Promise.all(instances.map((instance) => addInstanceToGenerateQueue(instance)));
};
