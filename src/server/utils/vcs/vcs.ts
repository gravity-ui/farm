import type {Request} from '@gravity-ui/expresskit';

import type {Output} from '../../../shared/common';
import type {FarmProjectConfig} from '../farmJsonConfig';

export interface VcsCheckoutProps {
    project: string;
    branch: string;
    instanceDir: string;
}

export interface VcsGetK8sCheckoutCommands {
    project: string;
    branch: string;
}

export interface CommonPullRequestData {
    action: 'opened' | 'closed';
    project: string;
    branch: string;
    title: string;
    description: string;
    includedConfigNames?: string;
    envVariables?: Record<string, string>;
    runEnvVariables?: Record<string, string>;
    labels?: Record<string, string>;
    uniqByLabels?: string[];
    webhookActionParameters?: Record<string, any>;
}

export type GetProjectConfigParams = VcsGetK8sCheckoutCommands;

export interface Vcs {
    startup(): Promise<void>;

    checkout(params: VcsCheckoutProps): Promise<Output[]>;
    getK8sCheckoutCommands(params: VcsGetK8sCheckoutCommands): string[];

    /** Converts VCS-specific data to a common format */
    parsePullRequestData(rawData: unknown): CommonPullRequestData;

    /** Determines if a request belongs to this VCS */
    isRequestFromThisVcs(request: Request): boolean;

    /** Determines if an event is a pull request */
    getEventName(request: Request): string | string[] | undefined;

    /** Fetches config file data */
    getProjectConfig(params: GetProjectConfigParams): Promise<FarmProjectConfig>;

    /** Fetches branches from remote repository */
    listBranches(projectName: string): Promise<string[]>;

    /** Get Project Repository Url */
    getProjectRepoUrl(projectName: string): string;
}
