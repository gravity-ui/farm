import _ from 'lodash';

import type {Instance, InstanceCommonStatus, Output} from '../../../shared/common';
import type {GenerateInstanceData, InstanceBuildLogsRow, InstanceRow} from '../../models/common';
import {getCurrentTime} from '../common';

import {knexInstance} from './knex';

export async function insertInstance(
    instance: GenerateInstanceData & {
        status: InstanceCommonStatus;
    },
): Promise<void> {
    await knexInstance('instances').insert({
        project: instance.project,
        branch: instance.branch,
        vcs: instance.vcs,
        url_template: instance.urlTemplate ?? null,
        env_variables: instance.envVariables ? JSON.stringify(instance.envVariables) : null,
        labels: instance.labels ? JSON.stringify(instance.labels) : null,
        run_env_variables: instance.runEnvVariables
            ? JSON.stringify(instance.runEnvVariables)
            : null,
        status: instance.status,
        description: instance.description ?? null,
        instance_config_name: instance.instanceConfigName,
        hash: instance.hash,
        created: String(Date.now()),
    });
}

export async function insertInstanceLogs(hash: string, logs: Output[]): Promise<void> {
    const logEntries = logs.reduce<Omit<InstanceBuildLogsRow, 'id'>[]>(
        (acc, {stdout = '', stderr = '', command = '', duration = 0, code = 0}) => {
            acc.push({
                hash,
                stdout,
                stderr,
                command,
                duration,
                code,
                created: getCurrentTime().toString(),
            });
            return acc;
        },
        [],
    );

    await knexInstance('instance_build_logs').insert(logEntries);
}

const mapInstanceRow = (row: InstanceRow): Instance => ({
    branch: row.branch,
    project: row.project,
    vcs: row.vcs,
    urlTemplate: row.url_template || undefined,
    status: row.status,
    instanceConfigName: row.instance_config_name,
    hash: row.hash || '',
    description: row.description || '',
    createdAt: row.created,
    envVariables: _.isEmpty(row.env_variables)
        ? undefined
        : JSON.parse(row.env_variables as string),
    labels: _.isEmpty(row.labels) ? undefined : JSON.parse(row.labels as string),
    runEnvVariables: _.isEmpty(row.run_env_variables)
        ? undefined
        : JSON.parse(row.run_env_variables as string),
});

export async function listInstances(): Promise<Instance[]> {
    const result = await knexInstance('instances').select().orderBy('created', 'asc');

    return result.map(mapInstanceRow);
}

export async function getInstancesByBranch(branch: string): Promise<Instance[]> {
    const result = await knexInstance('instances')
        .select()
        .where({branch})
        .orderBy('created', 'asc');

    return result.map(mapInstanceRow);
}

interface GetInstancesByStatusProps {
    limit?: number;
    status?: InstanceCommonStatus;
}

export async function getInstancesByStatus({
    limit,
    status = 'queued',
}: GetInstancesByStatusProps): Promise<Instance[]> {
    let result = knexInstance('instances').select().where({status}).orderBy('created', 'asc');
    if (limit) {
        result = result.limit(limit);
    }

    const data = await result;
    return data.map(mapInstanceRow);
}

export async function countGeneratingInstances(): Promise<number> {
    // @ts-ignore Incorrect type of knex
    const [{count}] = await knexInstance('instances')
        .count('hash as count')
        .where({status: 'generating'});

    const countNumber = Number(count);
    return Number.isInteger(countNumber) ? countNumber : 0;
}

export async function listInstanceBuildLogs(hash: string): Promise<InstanceBuildLogsRow[]> {
    return knexInstance('instance_build_logs')
        .select()
        .where({hash: hash})
        .orderBy('created', 'asc');
}

export async function clearInstanceData(hash: string): Promise<void> {
    await clearInstanceBuildLogs(hash);
    await knexInstance('instances').where({hash}).del();
}

export async function clearInstanceBuildLogs(hash: string): Promise<void> {
    await knexInstance('instance_build_logs').where({hash}).del();
}

export async function updateInstanceStatus(
    hash: string,
    status: InstanceCommonStatus,
): Promise<void> {
    await knexInstance('instances').where({hash}).update({status});
}

export async function getInstance(hash: string): Promise<Instance | undefined> {
    const result = await knexInstance('instances').select().where({hash}).first();

    if (!result) {
        return undefined;
    }

    return {
        instanceConfigName: result.instance_config_name,
        project: result.project,
        branch: result.branch,
        vcs: result.vcs,
        urlTemplate: result.url_template || undefined,
        status: result.status,
        createdAt: result.created,
        hash: result.hash,
        envVariables: result.env_variables ? JSON.parse(result.env_variables) : {},
        runEnvVariables: result.run_env_variables ? JSON.parse(result.run_env_variables) : {},
        labels: result.labels ? JSON.parse(result.labels) : {},
        description: result.description || '',
    };
}

export async function getInstancesByHashes(hashes: string[]): Promise<Instance[]> {
    const result = await knexInstance('instances')
        .select()
        .whereIn('hash', hashes)
        .orderBy('created', 'asc');

    return result.map(mapInstanceRow);
}

export async function listCurrentQueue(): Promise<Instance[]> {
    const result = await knexInstance('instances')
        .select()
        .whereIn('status', ['generating', 'queued', 'deleting'])
        .orderBy('created', 'asc');

    return result.map(mapInstanceRow);
}

export async function getInstancesByTTL(ttl: number): Promise<Instance[]> {
    const result = await knexInstance('instances')
        .select()
        .where({status: 'generated'})
        .whereRaw(`created < ?`, [String(Date.now() - ttl)])
        .orderBy('created', 'asc');

    return result.map(mapInstanceRow);
}
