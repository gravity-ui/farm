export type GenerateInstanceRequest = {
    project: string;
    branch: string;
    commit?: string;
    secretSourceHash?: string;
    vcs: string;
    description?: string;
    urlTemplate?: string;
    instanceConfigName?: string;
    labels?: Record<string, string>;
    stopTimeout?: number;
    [key: string]: unknown;
};

export type GenerateInstanceResponse = {
    hash: string;
};

export type GenerateInstanceError = {
    message: string;
    fields?: string[];
};
