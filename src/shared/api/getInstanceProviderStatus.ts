import type {InstanceProviderStatus} from '../common';

export interface GetInstanceProviderStatusRequest {
    hash: string;
}

export interface GetInstanceProviderStatusResponse {
    status?: InstanceProviderStatus;
}
