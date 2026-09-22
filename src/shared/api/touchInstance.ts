export type InstanceActivitySource = 'user' | 'test' | 'healthcheck';

export interface TouchInstanceRequest {
    hash: string;
    source: InstanceActivitySource;
}

export interface TouchInstanceResponse {}
