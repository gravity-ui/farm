import pathUtils from 'path';

import {AppError} from '@gravity-ui/nodekit';
import {omit} from 'lodash';
import generateHash from 'object-hash';

import type {Instance, ProjectFarmConfig} from '../../shared/common';
import {uiRoutes} from '../../shared/uiRoutes';
import {envConfig} from '../configs/env';
import type {InstanceInfo} from '../models/common';
import type {FarmConfig} from '../models/farmConfig';

export function getProviderConfig() {
    // expected directly using
    return envConfig.farmProvider;
}

export function generateInstanceHash(
    // required to ensure passing all props
    info: Required<Pick<Instance, 'branch' | 'instanceConfigName' | 'vcs' | 'project'>> & {
        /** @description additionalEnvVariables - only for defined on generation request, and not from already defined configurations */
        additionalEnvVariables: Instance['envVariables'];
        /** @description additionalRunEnvVariables - only for defined on generation request, and not from already defined configurations */
        additionalRunEnvVariables: Instance['runEnvVariables'];
    },
) {
    let {
        project,
        branch,
        instanceConfigName,
        vcs,
        additionalEnvVariables,
        additionalRunEnvVariables,
    } = info;
    project = project.toLowerCase();
    branch = branch || '';
    instanceConfigName = instanceConfigName || '';
    vcs = vcs || '';
    additionalEnvVariables = additionalEnvVariables || {};
    additionalRunEnvVariables = additionalRunEnvVariables || {};
    const hash = generateHash({
        project,
        branch,
        instanceConfigName,
        vcs,
        envVariables: additionalEnvVariables,
        runEnvVariables: additionalRunEnvVariables,
    });
    // replace first number with alphabet symbol for support most domain's standard implementation
    return hash.replace(/^[0-9]{1}/, 'x');
}

/** @deprecated */
export function getEncodedBranch(branch: string) {
    return branch.toLowerCase().replace('users/', '').replace(/[/.]/g, '-');
}

export const generatePath = ({
    path,
    params,
    baseUrl,
}: {
    path: string;
    params: Record<string, string>;
    baseUrl: string;
}) => {
    const generatedPath = path.replace(/:(\w+)/g, (_match, paramName) => {
        const value = params[paramName];
        if (value === undefined) {
            throw new Error(`Missing required path parameter: ${paramName}`);
        }

        return value;
    });

    return `${baseUrl}${generatedPath}`;
};

export function generateUIHref({hash, baseUrl}: {hash: string; baseUrl: string}) {
    return {
        buildLogs: generatePath({
            path: uiRoutes.instanceBuildLogs,
            params: {hash},
            baseUrl,
        }),
    };
}

// TODO(golbahsg): Refactor it to generateInstanceHostname
export function generateInstanceHref(
    props: Required<Pick<InstanceInfo, 'project' | 'hash'>> & Pick<InstanceInfo, 'urlTemplate'>,
) {
    const {project, hash, urlTemplate: instanceUrlTemplate} = props;

    const projectFarmConfig = getProjectFarmConfig(project);
    const finalUrlTemplate = instanceUrlTemplate || projectFarmConfig.urlTemplate;

    if (!finalUrlTemplate) {
        throw new Error('unknown urlTemplate');
    }

    return finalUrlTemplate?.replace('{hash}', hash).replace('{project}', project);
}

export function runAll<T, R>(array: T[], mapper: (val: T, index: number, originalArr: T[]) => R) {
    return Promise.all(array.map(mapper));
}

export async function runAllSync<T, R>(array: T[], mapper: (val: T) => R) {
    for (const item of array) {
        await mapper(item);
    }
}

export function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function getErrorMessage(error: unknown): string | null {
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message;
    }

    return null;
}

export function getCurrentTime() {
    return process.hrtime.bigint();
}

export function buildPath(...parts: (string | undefined)[]) {
    return pathUtils.join(...parts.filter((str) => str !== undefined));
}

export function getGlobalFarmConfig(): FarmConfig {
    return envConfig;
}

export function getProjectFarmConfig<C extends ProjectFarmConfig = ProjectFarmConfig>(
    project: string,
): C {
    if (!project) {
        throw new Error('Project is not provided');
    }

    const projectLevel = envConfig.projects?.[project];
    if (!projectLevel) {
        throw new Error(`Project ${project} not found in config`);
    }

    const globalLevel: FarmConfig = omit(envConfig, ['projects']);
    return Object.assign(globalLevel, projectLevel) as C;
}

export function getAllProjectNames() {
    return Object.keys(envConfig.projects || {});
}

export const formatError = (e: any) => {
    let stderr = '';
    if (e.status) {
        stderr += `status: ${e.status}\n`;
    }
    if (e.message) {
        stderr += `message: ${e.message}\n`;
    }
    if (e.stderr) {
        stderr += `stderr: ${e.stderr}\n`;
    }
    if (e.stack) {
        stderr += `stack: ${e.stack}\n`;
    }

    return stderr;
};

export function wrapInternalError(error: any) {
    return AppError.wrap(error, {
        details: error,
    });
}

export function filterEmptyObjectEntries<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => {
            return value !== undefined && value !== '' && key !== '' && value !== null;
        }),
    ) as T;
}
