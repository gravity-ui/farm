import type {InstanceCommonStatus, Output} from '../common';

export interface ListLogsResponse {
    logs: Output[];
    finished: boolean;
    status?: InstanceCommonStatus;
    message?: string;
}

export interface ListLogsRequest {
    hash: string;
}
