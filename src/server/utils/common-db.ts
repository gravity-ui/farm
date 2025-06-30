import type {Output} from '../../shared/common';
import type {InstanceDescription, InstanceInfo} from '../models/common';

import {generateInstanceHash, generateInstanceHref, getEncodedBranch} from './common';
import {insertInstanceLogs} from './db';

// Общие функции из которых осуществляются взаимодействие с базой.
// Было унесено из common.ts т.к. вызывало ошибку при использовании общего файла из тредов.

interface GetInstanceDescriptionData extends InstanceInfo {
    smokeTestsBuildId?: string;
    e2eTestsBuildId?: string;
}

export function getInstanceDescription(info: GetInstanceDescriptionData): InstanceDescription {
    const {
        project,
        branch,
        vcs,
        instanceConfigName,
        urlTemplate,
        smokeTestsBuildId,
        e2eTestsBuildId,
        envVariables = {},
        runEnvVariables = {},
    } = info;

    const encodedBranch = getEncodedBranch(branch);
    const hash =
        info.hash ??
        generateInstanceHash({
            branch,
            vcs,
            instanceConfigName,
            project,
            additionalEnvVariables: envVariables,
            additionalRunEnvVariables: runEnvVariables,
        });

    return {
        info,

        encodedBranch,
        hash,
        instanceUrl: generateInstanceHref({project, hash, urlTemplate}),
        instanceConfigName,
        urlTemplate,
        smokeTestsBuildId,
        e2eTestsBuildId,

        project,
        insertInstanceLogs: async (logs: Output[]) => {
            await insertInstanceLogs(hash, logs);
        },
    };
}
