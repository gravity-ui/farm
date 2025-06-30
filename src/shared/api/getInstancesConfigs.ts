export interface GetInstancesConfigsRequest {
    vcs: string;
    project: string;
    branch: string;
}

export interface GetInstancesConfigsResponse {
    configs: string[];
}
