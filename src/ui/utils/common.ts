import type {AxiosError} from 'axios';
import isNil from 'lodash/isNil';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';

import type {
    FarmConfigBase,
    Instance,
    InstanceCommonStatus,
    ProjectFarmConfig,
} from '../../shared/common';
import {ENV_PREFIX, LABEL_PREFIX, RUN_ENV_PREFIX} from '../../shared/constants';

const envConfig = JSON.parse(window.FM.farmConfig) as FarmConfigBase;

export function getGlobalFarmConfig(): FarmConfigBase {
    return envConfig;
}

export function getProjectFarmConfig(project: string): ProjectFarmConfig {
    if (!project) {
        throw new Error('Project is not provided');
    }

    const projectLevel = envConfig.projects?.[project];
    if (!projectLevel) {
        throw new Error(`Project ${project} not found in config`);
    }

    const globalLevel: FarmConfigBase = omit(envConfig, ['projects']);
    return Object.assign(globalLevel, projectLevel);
}

export function generateInstanceHref(
    props: Required<Pick<Instance, 'project' | 'hash'>> & Pick<Instance, 'urlTemplate'>,
) {
    const {project, hash, urlTemplate: instanceUrlTemplate} = props;

    const projectFarmConfig = getProjectFarmConfig(project);
    const finalUrlTemplate = instanceUrlTemplate || projectFarmConfig.urlTemplate;

    if (!finalUrlTemplate) {
        throw new Error('unknown urlTemplate');
    }

    return finalUrlTemplate?.replace('{hash}', hash).replace('{project}', project);
}

export function generateSearchParams(
    params: {[key: string]: string | number | undefined | null},
    location = {search: ''},
) {
    const currentParams = new URLSearchParams(location.search);

    Object.keys(params).forEach((key) => {
        const v = params[key];
        if (v !== '' && v !== undefined && v !== null) {
            currentParams.set(key, v.toString());
        } else {
            currentParams.delete(key);
        }
    });

    const search = currentParams.toString();

    return search ? '?' + search : '';
}

export const sleep = (ms: number) =>
    new Promise<void>((res) => {
        setTimeout(() => {
            res();
        }, ms);
    });

export const omitNullable = <T extends object>(obj: T) => omitBy<T>(obj, isNil);

export function prepareEnvVariables(
    envVariables: {[key: string]: string} = {},
    runEnvVariables: {[key: string]: string} = {},
) {
    const vars = Object.keys(envVariables).reduce(
        (acc, key) => {
            acc[`${ENV_PREFIX}${key}`] = envVariables[key];
            return acc;
        },
        {} as {[key: string]: string},
    );
    const runVars = Object.keys(runEnvVariables).reduce(
        (acc, key) => {
            acc[`${RUN_ENV_PREFIX}${key}`] = runEnvVariables[key];
            return acc;
        },
        {} as {[key: string]: string},
    );

    return {...vars, ...runVars};
}

export function prepareLabels(labels: {[key: string]: string} = {}) {
    return Object.keys(labels).reduce(
        (acc, key) => {
            acc[`${LABEL_PREFIX}${key}`] = labels[key];
            return acc;
        },
        {} as {[key: string]: string},
    );
}

export const getBuildStatusTheme = (status?: InstanceCommonStatus) => {
    switch (status) {
        case 'errored':
        case 'deleting':
            return 'danger';
        case 'queued':
            return 'warning';
        case 'generated':
            return 'success';
        default:
            return 'info';
    }
};

function getErrorMessage(error: unknown): string | null {
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

export const getErrorMessageFromAxios = (error: AxiosError<{message?: string} | string>) => {
    const responseError =
        typeof error.response?.data === 'string'
            ? error.response.data
            : error.response?.data?.message;

    return (responseError || getErrorMessage(error)) ?? 'Unknown error';
};

export function generateApiLink(apiPath: string, hash: string) {
    return `${location.origin}/${apiPath}${generateSearchParams({
        hash,
    })}`;
}
