import type {Instance} from '../common';

export interface ListProjectInstancesRequest {
    projectName?: string;
    vcs?: string;
    hash?: string;
    labels?: Record<string, string>;
}

export interface ListProjectInstancesResponse {
    instances: Instance[];
    urls: Record<string, string>;
    buildLogsUrls: Record<string, string>;
}
