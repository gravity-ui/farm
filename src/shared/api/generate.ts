export type GenerateInstanceRequest = {
    project: string;
    branch: string;
    vcs: string;
    description?: string;
    urlTemplate?: string;
    instanceConfigName?: string;
    labels?: Record<string, string>;
    stopTimeout?: number;
    instanceHashLength?: number;
    [key: string]: unknown;
};

export type GenerateInstanceResponse = {
    hash: string;
};
