import type {Instance} from '../common';

export interface GetInstanceResponse {
    instance?: Instance;
    url?: string;
    error?: unknown;
}

export interface GetInstanceRequest {
    hash: string;
}
