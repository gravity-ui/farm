export interface VcsProvider {
    id: string;
    name: string;
}

export interface ListVcsProvidersResponse {
    providers: VcsProvider[];
}

export interface ListVcsProvidersRequest {}
