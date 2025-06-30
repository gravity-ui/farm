export interface GetProjectRepoUrlRequest {
    project: string;
    vcs: string;
}

export interface GetProjectRepoUrlResponse {
    url: string;
}
