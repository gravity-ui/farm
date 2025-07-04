import type {AppContext} from '@gravity-ui/nodekit/dist/lib/context';
import type {HttpStatusCode} from 'axios';

export type InstanceCommonStatus = 'queued' | 'generating' | 'generated' | 'deleting' | 'errored';
export type InstanceProviderStatus =
    | 'starting'
    | 'running'
    | 'stopped'
    | 'errored'
    | 'unhealthy'
    | 'unknown';

export interface Instance {
    branch: string;
    vcs: string;
    project: string;
    createdAt: string;
    status: InstanceCommonStatus;
    hash: string;
    envVariables?: Record<string, string>;
    labels?: Record<string, string>;
    runEnvVariables?: Record<string, string>;
    urlTemplate?: string;
    description?: string;
    instanceConfigName: string;
}

export interface InstanceWithProviderStatus extends Instance {
    providerStatus: InstanceProviderStatus;
    startTime?: number;
}

export interface QueuedInstance extends InstanceWithProviderStatus {
    queuePosition: number;
}

export interface ApiActionParams<T = unknown> {
    ctx: AppContext;
    data: T;
    baseUrl?: string;
}

export type ApiAction<TRequest = unknown, TResponse = unknown> = (
    params: ApiActionParams<TRequest>,
) => Promise<{
    ok: boolean;
    data?: TResponse;
    message?: string;
    status?: HttpStatusCode;
}>;

export type LogSpec = {
    maxLines?: number;
    // TODO(golbahsg): Looks like it is unused
    filter?: string;
};

export interface FarmConfigBase {
    company: string;
    instanceDomain?: string;
    defaultProject?: string;
    /**
     * Instance life before stop in ms.
     */
    instanceStopTimeout?: number;
    /**
     * Instance life before deletion in ms.
     *
     * Deletes only `generated` instances, that were created more than `instanceDeleteTimeout` ms ago.
     */
    instanceDeleteTimeout?: number;
    autoStartDelay?: number;
    maxConcurrentBuilds?: number;
    maxRunningInstances?: number;
    urlTemplate?: string;
    defaultBranch?: string;
    vcs?: string;

    vcsCredentials?: {
        [key: string]: VcsCredentialsConfig | undefined;
    };

    projects?: Record<string, ProjectFarmConfig>;
}

export interface VcsCredentialsConfig {
    hostname?: string;
    authTokenEnvName?: string;
    // X-GitHub-Event, X-GitLab-Event, X-Bitbucket-Event (default defined in VCS provider, for GIT is X-GitHub-Event)
    webhookEventNameHeader?: string;
}

export type ObservedBranch = string;

export type EnvVariables = Record<string, string>;

export type ProjectFarmConfig = Omit<FarmConfigBase, 'projects'> & {
    repositoryPath: string;
    monoRepoPath?: string;
};

export interface Output {
    command: string | null;
    stdout: string | null;
    stderr: string | null;
    duration: number | null;
    code: string | number | null;
}

export interface InstanceProviderInfo {
    hash: string;
    status: InstanceProviderStatus;
    startTime: number;
}

export interface User {
    avatarUrl: string;
    displayName: string;
    lang: string;
    uid: string;
    login: string;
}
export type HelpListItem = {
    text: string;
    i18nTextKey?: string;
    url?: string;
    disabled?: boolean;
    view?: 'primary' | 'secondary';
};
