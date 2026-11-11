import _ from 'lodash';

import type {Instance, InstanceCommonStatus, Output} from '../../../shared/common';
import type {GenerateInstanceData, InstanceBuildLogsRow, InstanceRow} from '../../models/common';
import {getCurrentTime, getGlobalFarmConfig} from '../common';
import {
    createSecretLogRedactor,
    getSecretValues,
    maskLogFragments,
    registerSecretValues,
    registerSecrets,
} from '../secret-env';

import {knexInstance} from './knex';

export async function insertInstance(
    instance: GenerateInstanceData & {
        status: InstanceCommonStatus;
    },
): Promise<void> {
    registerSecrets(instance);
    await knexInstance('instances').insert({
        project: instance.project,
        branch: instance.branch,
        commit: instance.commit ?? null,
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
        stop_timeout: instance.stopTimeout ?? null,
        hash: instance.hash,
        created: String(Date.now()),
    });
}

const logRedactors = new Map<string, ReturnType<typeof createSecretLogRedactor>>();

const pendingLogWrites = new Map<string, Promise<void>>();

export function insertInstanceLogs(hash: string, logs: Output[]): Promise<void> {
    const pending = (pendingLogWrites.get(hash) || Promise.resolve())
        .catch(() => undefined)
        .then(() => storeInstanceLogs(hash, logs));
    pendingLogWrites.set(hash, pending);
    return pending.finally(() => {
        if (pendingLogWrites.get(hash) === pending) pendingLogWrites.delete(hash);
    });
}

async function storeInstanceLogs(hash: string, logs: Output[]): Promise<void> {
    registerSecrets(getGlobalFarmConfig());
    registerSecrets(await getInstance(hash));
    let redactor = logRedactors.get(hash);
    if (!redactor) {
        redactor = createSecretLogRedactor();
        logRedactors.set(hash, redactor);
    }
    const logEntries = redactor
        .redact(logs)
        .reduce<
            Omit<InstanceBuildLogsRow, 'id'>[]
        >((acc, {stdout = '', stderr = '', command = '', duration = 0, code = 0}) => {
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
        }, []);

    await knexInstance('instance_build_logs').insert(logEntries);
}

const parseStoredEnv = (
    serialized: string | null,
): {variables: Record<string, string>; secretSnapshot: string[]} => {
    const parsed = serialized ? JSON.parse(serialized) : {};
    if (
        parsed.variables &&
        typeof parsed.variables === 'object' &&
        Array.isArray(parsed.secretSnapshot)
    ) {
        return {
            variables: parsed.variables,
            secretSnapshot: parsed.secretSnapshot.filter(
                (value: unknown): value is string => typeof value === 'string',
            ),
        };
    }
    return {variables: parsed, secretSnapshot: []};
};

export async function updateInstanceSecretSnapshot(hash: string, source: unknown): Promise<void> {
    const snapshot = getSecretValues(source);
    if (!snapshot.length) return;
    const row = await knexInstance('instances').select('env_variables').where({hash}).first();
    if (!row) return;
    const stored = parseStoredEnv(row.env_variables);
    const secretSnapshot = Array.from(new Set([...stored.secretSnapshot, ...snapshot]));
    await knexInstance('instances')
        .where({hash})
        .update({env_variables: JSON.stringify({variables: stored.variables, secretSnapshot})});
    registerSecretValues(secretSnapshot);
}

const mapInstanceRow = (row: InstanceRow): Instance => {
    const env = parseStoredEnv(row.env_variables);
    registerSecretValues(env.secretSnapshot);
    const instance: Instance = {
        branch: row.branch,
        commit: row.commit || undefined,
        project: row.project,
        vcs: row.vcs,
        urlTemplate: row.url_template || undefined,
        status: row.status,
        instanceConfigName: row.instance_config_name,
        hash: row.hash || '',
        description: row.description || '',
        createdAt: row.created,
        envVariables: _.isEmpty(env.variables) ? undefined : env.variables,
        labels: _.isEmpty(row.labels) ? undefined : JSON.parse(row.labels as string),
        runEnvVariables: _.isEmpty(row.run_env_variables)
            ? undefined
            : JSON.parse(row.run_env_variables as string),
        stopTimeout: row.stop_timeout || undefined,
        lastActivityAt: row.last_activity_at ? Number(row.last_activity_at) : undefined,
    };
    registerSecrets(instance);
    return instance;
};

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
    registerSecrets(getGlobalFarmConfig());
    registerSecrets(await getInstance(hash));
    const logs = await knexInstance('instance_build_logs')
        .select()
        .where({hash: hash})
        .orderBy('created', 'asc');
    return maskLogFragments(logs);
}

export async function clearInstanceData(hash: string): Promise<void> {
    await clearInstanceBuildLogs(hash);
    await knexInstance('instances').where({hash}).del();
}

export async function clearInstanceBuildLogs(hash: string): Promise<void> {
    await pendingLogWrites.get(hash)?.catch(() => undefined);
    logRedactors.delete(hash);
    await knexInstance('instance_build_logs').where({hash}).del();
}

export async function updateInstanceStatus(
    hash: string,
    status: InstanceCommonStatus,
): Promise<void> {
    await knexInstance('instances').where({hash}).update({status});
}

export async function updateInstanceLastActivityAt(hash: string): Promise<void> {
    await knexInstance('instances')
        .where({hash})
        .update({last_activity_at: String(Date.now())});
}

export async function getInstance(hash: string): Promise<Instance | undefined> {
    const result = await knexInstance('instances').select().where({hash}).first();

    if (!result) {
        return undefined;
    }

    return mapInstanceRow(result);
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

export async function finishInstanceLogs(hash: string): Promise<void> {
    await pendingLogWrites.get(hash)?.catch(() => undefined);
    const redactor = logRedactors.get(hash);
    if (!redactor) return;
    const tail = redactor.finish();
    if (tail.stdout || tail.stderr)
        await insertInstanceLogs(hash, [{...tail, command: null, duration: null, code: 0}]);
    logRedactors.delete(hash);
}
