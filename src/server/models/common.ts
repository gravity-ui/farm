import type {Request, Response} from '@gravity-ui/expresskit';
import type {RequestHandler} from 'express';

import type {Instance, InstanceCommonStatus, Output, User} from '../../shared/common';

export interface InstanceRow {
    project: string;
    branch: string;
    status: InstanceCommonStatus;
    instance_config_name: string;
    created: string;
    vcs: string;
    hash: string;
    env_variables: string | null;
    run_env_variables: string | null;
    url_template: string | null;
    description: string | null;
    labels: string | null;
}

// TODO(golbahsg): Merge instance types
export interface InstanceInfo {
    hash?: string;
    vcs: string;
    project: string;
    branch: string;
    description?: string;
    urlTemplate?: string;
    instanceConfigName: string;
    envVariables?: Record<string, string>;
    runEnvVariables?: Record<string, string>;
    labels?: Record<string, string>;
}

export interface InstanceDescription {
    info: InstanceInfo;

    hash: string;
    instanceUrl: string;
    encodedBranch: string;
    instanceConfigName: string;
    urlTemplate?: string;

    smokeTestsBuildId?: string;
    e2eTestsBuildId?: string;
    project: string;
    insertInstanceLogs: (logs: Output[]) => Promise<void>;
}

export interface GenerateInstanceData extends InstanceInfo {
    hash: string;
}

export interface InstanceBuildLogsRow extends Output {
    id: number;
    hash: string;
    created: string;
}

export type Command = string;

export interface InstanceObservableEmitValue {
    output?: Output[];
    config?: Pick<Instance, 'status'>;
    pid?: number;
}

export interface AuthProvider {
    authMiddleware?: RequestHandler;

    getUserInfo?: (req: Request, res: Response) => Promise<User | undefined>;
}
