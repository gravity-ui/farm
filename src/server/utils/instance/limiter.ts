import type {InstanceCommonStatus, InstanceProviderStatus} from '../../../shared/common';
import {getFarmProvider} from '../../components/farm-provider';
import {getProjectFarmConfig} from '../common';
import {listInstances} from '../db';

export const RunningLimitsErrorMessage = 'Limit maxRunningInstances is exceed';

const activeCommonStatusesSet: Set<InstanceCommonStatus> = new Set(['queued', 'generating']);
const activeProviderStatusesSet: Set<InstanceProviderStatus> = new Set(['starting', 'running']);

export async function isGenerateAllowedByLimits(
    project: string,
    instanceHashToGenerate: string,
): Promise<boolean> {
    const runningLimit = getProjectFarmConfig(project).maxRunningInstances;
    if (typeof runningLimit !== 'number') {
        return true;
    }

    const [instances, providerInstances] = await Promise.all([
        listInstances(),
        getFarmProvider().getInstances(),
    ]);
    const providerInstancesMap = new Map(
        providerInstances.map((providerInstance) => [providerInstance.hash, providerInstance]),
    );

    const projectActiveInstances = instances.filter((instance) => {
        const providerInstance = providerInstancesMap.get(instance.hash);

        const isTargetProject = instance.project === project;
        const isInstanceToGenerate = instanceHashToGenerate === instance.hash;

        const isActive =
            activeCommonStatusesSet.has(instance.status) ||
            (providerInstance && activeProviderStatusesSet.has(providerInstance.status));

        const isActiveInTargetProject = isTargetProject && isActive;

        // No check for active instance to generate again
        if (isActiveInTargetProject && isInstanceToGenerate) {
            return false;
        }

        return isActiveInTargetProject;
    });

    return projectActiveInstances.length < runningLimit;
}
