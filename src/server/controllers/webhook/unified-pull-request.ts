import type {AppContext} from '@gravity-ui/nodekit';
import {AppError} from '@gravity-ui/nodekit';
import {isEmpty} from 'lodash';

import type {Instance} from '../../../shared/common';
import deleteInstance from '../../components/api-actions/deleteInstance';
import {coreRegistry} from '../../components/core-plugin-registry';
import {
    filterEmptyObjectEntries,
    generateInstanceHash,
    runAll,
    runAllSync,
    wrapInternalError,
} from '../../utils/common';
import {getInstanceDescription} from '../../utils/common-db';
import {getInstance, listInstances} from '../../utils/db';
import {fetchProjectConfig} from '../../utils/farmJsonConfig';
import type {CommonPullRequestData} from '../../utils/vcs/vcs';

import {getCurrentInstanceAndGenerate} from './common';

function filterInstancesByLabels(
    instances: Instance[],
    labels: Record<string, string> | undefined,
    uniqByLabels: string[] | undefined,
): Instance[] | undefined {
    if (!labels || isEmpty(labels) || !uniqByLabels || uniqByLabels.length === 0) {
        return undefined;
    }

    return instances.filter((instance) =>
        uniqByLabels.every((label) => instance.labels?.[label] === labels[label]),
    );
}

export async function handleUnifiedPullRequest(
    commonData: CommonPullRequestData,
    vcs: string,
    ctx: AppContext,
) {
    const {labels, uniqByLabels, webhookActionParameters} = commonData;

    // Get VCS implementation through core registry
    const vcsPlugin = coreRegistry.vcs.getPlugins()[vcs];
    if (!vcsPlugin) {
        throw new Error(`No VCS implementation found for ${vcs}`);
    }

    try {
        if (commonData.action === 'opened') {
            const configFile = await fetchProjectConfig({
                project: commonData.project,
                branch: commonData.branch,
                commit: commonData.commit,
                vcs,
            });

            if (commonData.includedConfigNames) {
                const includedInstancesArr = commonData.includedConfigNames
                    .split(',')
                    .filter(Boolean);
                configFile.preview = configFile.preview.filter((cfg) =>
                    includedInstancesArr.includes(cfg.name),
                );
            }

            const instanceHashMap = new Map<string, string>();
            const projectInstances = await listInstances({project: commonData.project});

            const instanceDescriptions = await runAll(configFile.preview, (instanceConfig) =>
                getInstanceDescription({
                    vcs,
                    project: commonData.project,
                    branch: commonData.branch,
                    commit: commonData.commit,
                    instanceConfigName: instanceConfig.name,
                    urlTemplate: instanceConfig.urlTemplate,
                }),
            );

            const finalLabels = labels ? filterEmptyObjectEntries(labels) : undefined;
            const finalEnvVariables = commonData.envVariables
                ? filterEmptyObjectEntries(commonData.envVariables)
                : undefined;
            const finalRunEnvVariables = commonData.runEnvVariables
                ? filterEmptyObjectEntries(commonData.runEnvVariables)
                : undefined;

            for (const config of configFile.preview) {
                instanceHashMap.set(
                    config.name,
                    generateInstanceHash({
                        project: commonData.project,
                        vcs,
                        branch: commonData.branch,
                        instanceConfigName: config.name,
                        additionalEnvVariables: finalEnvVariables,
                        additionalRunEnvVariables: finalRunEnvVariables,
                    }),
                );
            }

            // Instances with a hash from this event are regenerated in place, not deleted
            const newHashes = new Set(instanceHashMap.values());
            const sameInstances = (
                filterInstancesByLabels(projectInstances, finalLabels, uniqByLabels) ?? []
            ).filter((instance) => !newHashes.has(instance.hash));

            if (sameInstances.length > 0) {
                ctx.log('Found same instances. Deleting them.', {
                    sameInstances: sameInstances.map((instance) => instance.hash),
                });

                await runAll(sameInstances, async (instance) => {
                    await deleteInstance({data: {hash: instance.hash}, ctx});
                });
            }

            await runAllSync(configFile.preview, async (config) => {
                const hash = instanceHashMap.get(config.name);

                await getCurrentInstanceAndGenerate({
                    hash,
                    vcs,
                    project: commonData.project,
                    branch: commonData.branch,
                    commit: commonData.commit,
                    instanceConfigName: config.name,
                    urlTemplate: config.urlTemplate,
                    description: commonData.description,
                    envVariables: finalEnvVariables,
                    runEnvVariables: finalRunEnvVariables,
                    labels: finalLabels,
                    stopTimeout: commonData.stopTimeout,
                });
            });

            const webhookActions = coreRegistry.webhookActions.getPlugins();
            for (const [name, action] of Object.entries(webhookActions)) {
                if (!action) {
                    ctx.logError(
                        'WEBHOOK_ACTION_NOT_FOUND',
                        new AppError(`Webhook action not found`),
                        {name},
                    );
                    continue;
                }

                try {
                    await runAll(instanceDescriptions, async (instanceDescription) => {
                        const hash = instanceHashMap.get(instanceDescription.instanceConfigName);

                        if (!hash) {
                            ctx.logError('HASH_NOT_FOUND', new AppError('Hash not found'), {
                                instanceConfigName: instanceDescription.instanceConfigName,
                            });
                            return;
                        }

                        const instance = await getInstance(hash);
                        if (!instance) {
                            ctx.logError('INSTANCE_NOT_FOUND', new AppError('Instance not found'), {
                                hash,
                            });
                            return;
                        }

                        await action.onPullRequestOpenAfterCreateInstance(
                            instance,
                            webhookActionParameters || {},
                        );
                    });
                } catch (error) {
                    ctx.logError('WEBHOOK_ACTION_ERROR', wrapInternalError(error), {name});
                }
            }
        } else if (commonData.action === 'closed') {
            const branchInstances = await listInstances({
                project: commonData.project,
                branch: commonData.branch,
            });
            const finalLabels = labels ? filterEmptyObjectEntries(labels) : undefined;
            const instances =
                filterInstancesByLabels(branchInstances, finalLabels, uniqByLabels) ??
                branchInstances;

            ctx.log('Deleting instances of closed pull request.', {
                project: commonData.project,
                branch: commonData.branch,
                labels: finalLabels,
                uniqByLabels,
                instances: instances.map((instance) => instance.hash),
            });

            const webhookActions = coreRegistry.webhookActions.getPlugins();
            for (const [name, action] of Object.entries(webhookActions)) {
                if (!action || !action.onPullRequestClosed) {
                    continue;
                }

                try {
                    await action.onPullRequestClosed(webhookActionParameters || {});
                } catch (error) {
                    ctx.logError('WEBHOOK_ACTION_ON_PR_CLOSED_ERROR', wrapInternalError(error), {
                        name,
                    });
                }
            }

            await runAll(instances, async (instance) => {
                await deleteInstance({
                    data: {
                        hash: instance.hash,
                    },
                    ctx,
                });
            });
        }
    } catch (error) {
        if (error instanceof Error) {
            ctx.logError('PROCESS_WEBHOOK_ON_PULL_REQUEST', wrapInternalError(error), {
                ...commonData,
                error: error.message,
            });
        }
        throw error;
    }
}
