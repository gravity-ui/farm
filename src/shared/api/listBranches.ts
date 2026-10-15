export interface ListBranchesResponse {
    branches: string[];
}

export interface ListBranchesRequest {
    project: string;
    refType?: 'branch' | 'tag';
    query?: string;
}
