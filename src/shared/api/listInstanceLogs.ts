import type {LogSpec} from '../common';

export interface ListInstanceLogsRequest {
    hash: string;
    params?: {
        stdError?: LogSpec;
        stdOut?: LogSpec;
    };
}

export interface ListInstanceLogsResponse {
    message?: string;
    stdout?: string;
    stderr?: string;
}
