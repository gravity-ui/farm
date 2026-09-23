export interface GetInstancesConfigsRequest {
    vcs: string;
    project: string;
    branch: string;
    commit?: string;
}

export interface GetInstancesConfigsResponse {
    configs: string[];
}
