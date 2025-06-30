import path from 'path';

import type * as k8s from '@kubernetes/client-node';

import {coreRegistry} from '../components/core-plugin-registry';
import type {DockerInstanceHealthcheck} from '../components/farm-provider/docker/types';

import {fileExists, readFile} from './files';
import {getVcs} from './vcs';

// TODO(golbahsg): Replace `string` with `string[]`, following the pattern of docker and k8s
export interface FarmFileStartConfig {
    command: string;
    args: string;
}

export type CmdListSpec = string[];

export interface FarmJsonConfig {
    name: string;

    // common
    urlTemplate?: string;
    env?: Record<string, string>;
    runEnv?: Record<string, string>;
    start?: FarmFileStartConfig;

    // docker and other extensions of core
    envInheritance?: Record<string, string>;

    // docker & k8s
    dockerfilePath?: string;

    // docker
    dockerfileContextPath?: string;
    dockerInstanceHealthcheck?: DockerInstanceHealthcheck;

    // k8s
    builderImage?: string;
    builderEnvSecretName?: string;
    instanceEnvSecretName?: string;
    instancePort?: number;
    instanceProbe?: k8s.V1Probe;
    startBuilderTimeout?: number;
    startInstanceTimeout?: number;
    buildTimeout?: number;

    // Deprecated
    /** @deprecated */
    smokeTestsBuildId?: string;
    /** @deprecated */
    e2eTestsBuildId?: string;
}

export interface FarmProjectConfigSection extends Omit<FarmJsonConfig, 'name'> {
    instances: FarmJsonConfig[];
}

export interface FarmProjectConfig {
    'preview-generator'?: FarmProjectConfigSection;
}

function formatProjectConfig<T = FarmJsonConfig, U = {preview: T[]}>(config: FarmProjectConfig): U {
    return {
        preview: formatProjectConfigSection<T>(config['preview-generator']),
    } as U;
}

function formatProjectConfigSection<T = FarmJsonConfig>(section?: unknown): T[] {
    // Return empty array if section is not provided or invalid
    if (!section || typeof section !== 'object' || section === null) {
        return [];
    }

    // Type cast section to basic type with possible instances
    type SectionType = Record<string, unknown> & {
        instances?: Array<Record<string, unknown>>;
    };
    const typedSection = section as SectionType;

    // Get all registered config fields from core registry
    const configFields = coreRegistry.farmJsonConfig.getFields();

    // Base config (global values)
    const baseConfig: Record<string, unknown> = {};

    // Type definition for instance configs
    type InstanceConfigType = Record<string, unknown> & {name?: string};
    const instanceConfigs: InstanceConfigType[] =
        Array.isArray(typedSection.instances) && typedSection.instances.length > 0
            ? typedSection.instances
            : [{name: ''}];

    // Build base config from section fields
    configFields.forEach((fieldDef) => {
        const fieldName = typeof fieldDef === 'string' ? fieldDef : fieldDef.field;
        if (typedSection[fieldName] !== undefined) {
            baseConfig[fieldName] = typedSection[fieldName];
        }
    });

    // Process each instance config
    return instanceConfigs.map((instanceConfig) => {
        const resultConfig: Record<string, unknown> = {};

        configFields.forEach((fieldDef) => {
            const fieldName = typeof fieldDef === 'string' ? fieldDef : fieldDef.field;
            const shouldMerge = typeof fieldDef !== 'string' && fieldDef.mergeWithGlobal;

            const instanceValue = instanceConfig[fieldName];
            const baseValue = baseConfig[fieldName];

            // Merge objects for fields with mergeWithGlobal flag
            if (
                shouldMerge &&
                typeof baseValue === 'object' &&
                baseValue !== null &&
                typeof instanceValue === 'object' &&
                instanceValue !== null
            ) {
                resultConfig[fieldName] = {
                    ...baseValue,
                    ...instanceValue,
                };
            } else {
                // Use instance value if exists, otherwise use base value
                resultConfig[fieldName] = instanceValue !== undefined ? instanceValue : baseValue;
            }
        });

        return resultConfig as unknown as T;
    });
}

export interface FetchProjectConfigParams {
    vcs: string;
    project: string;
    branch: string;
}

export async function fetchProjectConfig(params: FetchProjectConfigParams) {
    const vcs = getVcs(params.vcs);
    if (!vcs) {
        throw new Error(`Failed to fetch project config. Unknown vcs: ${params.vcs}`);
    }

    const {project, branch} = params;
    return formatProjectConfig(await vcs.getProjectConfig({project, branch}));
}

export async function readConfigFile(instancePath: string) {
    let configFilePath = path.resolve(instancePath, 'farm.json');

    if (!(await fileExists(configFilePath))) {
        configFilePath = path.resolve(instancePath, 'package.json');

        if (!(await fileExists(configFilePath))) {
            return undefined;
        }
    }

    const configString = await readFile(configFilePath, 'utf-8');
    const config: FarmProjectConfig = JSON.parse(configString);

    return formatProjectConfig(config);
}

export function getInstanceConfig<
    T extends FarmJsonConfig = FarmJsonConfig,
    U extends {preview: T[]} = {preview: T[]},
>(config: U, instanceConfigName: string): {preview: T | undefined} {
    const result = getSectionConfig(config.preview, instanceConfigName);
    return {
        preview: result as T | undefined,
    };
}

function getSectionConfig(section: FarmJsonConfig[], name: string) {
    return section.find((instanceConfig) => instanceConfig.name === name);
}
