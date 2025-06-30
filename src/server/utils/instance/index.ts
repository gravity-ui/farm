import type {Project} from '../../../shared/api/listProjects';
import type {Instance} from '../../../shared/common';
import {getFarmProvider} from '../../components/farm-provider';
import type {InstanceInfo} from '../../models/common';
import {generateInstanceHash} from '../common';
import * as db from '../db';

import {RunningLimitsErrorMessage, isGenerateAllowedByLimits} from './limiter';

/**
 * Adds instance to generate queue:
 * clears instance data, inserts instance into database and pushes instance to queue
 * @throws {Error} if instance is not allowed to generate
 */
async function addInstanceToGenerateQueue(instanceInfo: InstanceInfo) {
    const hash = generateInstanceHash({
        branch: instanceInfo.branch,
        instanceConfigName: instanceInfo.instanceConfigName,
        project: instanceInfo.project,
        vcs: instanceInfo.vcs,
        additionalEnvVariables: instanceInfo.envVariables ?? {},
        additionalRunEnvVariables: instanceInfo.runEnvVariables ?? {},
    });

    const isGenerateAllowed = await isGenerateAllowedByLimits(instanceInfo.project, hash);
    if (!isGenerateAllowed) {
        throw new Error(RunningLimitsErrorMessage);
    }

    // stop current build
    await getFarmProvider().stopBuilder(hash);

    await db.clearInstanceData(hash);

    await db.insertInstance({
        ...instanceInfo,
        hash,
        status: 'queued',
    });
}

/**
 * Adds instance to delete queue
 *
 * updates instance status to 'deleting' and pushes instance to queue
 */
const addInstanceToDeleteQueue = async (instance: Instance) => {
    await db.updateInstanceStatus(instance.hash, 'deleting');
};

/**
 * Stop instance
 *
 * calls `getFarmProvider().stopInstance` and updates instance status to 'stopped'
 */
const stopInstance = async (hash: string) => {
    await getFarmProvider().stopInstance(hash);
};

/**
 * Start instance
 *
 * calls `getFarmProvider().startInstance` and updates instance status to 'started'
 * @throws {Error} if instance is not allowed to start
 */
const startInstance = async (instance: Instance) => {
    const isGenerateAllowed = await isGenerateAllowedByLimits(instance.project, instance.hash);
    if (!isGenerateAllowed) {
        throw new Error(RunningLimitsErrorMessage);
    }

    await getFarmProvider().startInstance(instance);
};

/**
 * Restart instance
 *
 */
const restartInstance = async (instance: Instance) => {
    const isGenerateAllowed = await isGenerateAllowedByLimits(instance.project, instance.hash);
    if (!isGenerateAllowed) {
        throw new Error(RunningLimitsErrorMessage);
    }

    await getFarmProvider().restartInstance(instance);
};

/**
 * Get all projects with instances
 *
 * @returns Array of projects with instances
 */
const getProjectsWithInstances = async () => {
    const instances = await db.listInstances();
    const vcsProjectMap = new Map<string, Map<string, Instance[]>>();

    instances.forEach((instance) => {
        if (!vcsProjectMap.has(instance.vcs)) {
            vcsProjectMap.set(instance.vcs, new Map());
        }
        if (!vcsProjectMap.get(instance.vcs)?.has(instance.project)) {
            vcsProjectMap.get(instance.vcs)?.set(instance.project, []);
        }
        vcsProjectMap.get(instance.vcs)?.get(instance.project)?.push(instance);
    });

    const projects: Project[] = [];

    vcsProjectMap.forEach((projectsList, vcs) => {
        projectsList.forEach((items, projectName) => {
            projects.push({
                name: projectName,
                vcs,
                items,
            });
        });
    });

    return projects.sort((a, b) => a.name.localeCompare(b.name));
};

export {
    addInstanceToDeleteQueue,
    // with queue involved
    addInstanceToGenerateQueue,
    getProjectsWithInstances,
    restartInstance,
    // common functions
    startInstance,
    stopInstance,
};
