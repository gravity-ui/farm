# Farm API

## General Information

The Farm API provides an interface for managing instances, projects, and other system resources. All API endpoints return data in JSON format.

## Endpoints

### POST /api/generate

Creates a new instance.

**Body**

```typescript
{
    project: string;
    branch: string;
    vcs: string;
    description?: string;
    urlTemplate?: string;
    instanceConfigName?: string;
    labels?: Record<string, string>;
    [key: string]: unknown;
}
```

**Response**

```typescript
{
    hash: string;
}
```

### POST /api/:action

Universal endpoint for performing various actions. Available actions are listed below.

#### listProjects

Gets a list of all projects.

**Method**: `POST`

**Action**: `listProjects`

**Body**

```typescript
{}
```

**Response**

```typescript
{
    projects: {
        name: string;
        vcs: string;
        items: Instance[];
    }[];
}
```

#### searchProjects

Searches for projects by name pattern.

**Method**: `POST`

**Action**: `searchProjects`

**Body**

```typescript
{
    projectPattern: string;
}
```

**Response**

```typescript
{
    projects: {
        name: string;
        vcs: string;
        items: Instance[];
    }[] | undefined;
}
```

#### listProjectInstances

Gets a list of instances for the specified project.

**Method**: `POST`

**Action**: `listProjectInstances`

**Body**

```typescript
{
    projectName?: string;
    vcs?: string;
    hash?: string;
    labels?: Record<string, string>;
}
```

**Response**

```typescript
{
    instances: Instance[];
    urls: Record<string, string>;
    buildLogsUrls: Record<string, string>;
}
```

#### deleteInstance

Deletes the specified instance.

**Method**: `POST`

**Action**: `deleteInstance`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{
    message: string;
}
```

#### deleteInstances

Deletes multiple instances.

**Method**: `POST`

**Action**: `deleteInstances`

**Body**

```typescript
{
    hashes: string[];
}
```

**Response**

```typescript
{
    message: string;
}
```

#### listLogs

Gets build logs for the specified instance.

**Method**: `POST`

**Action**: `listLogs`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{
    logs: Output[];
    finished: boolean;
    status?: InstanceCommonStatus;
    message?: string;
}
```

#### listInstanceLogs

Gets execution logs for the specified instance.

**Method**: `POST`

**Action**: `listInstanceLogs`

**Body**

```typescript
{
    hash: string;
    params?: {
        stdError?: LogSpec;
        stdOut?: LogSpec;
    };
}
```

**Response**

```typescript
{
    message?: string;
    stdout?: string;
    stderr?: string;
}
```

#### listBranches

Gets a list of branches for the specified project.

**Method**: `POST`

**Action**: `listBranches`

**Body**

```typescript
{
    project: string;
}
```

**Response**

```typescript
{
    branches: string[];
}
```

#### listProviderInstances

Gets a list of instances from the provider.

**Method**: `POST`

**Action**: `listProviderInstances`

**Body**

```typescript
{}
```

**Response**

```typescript
{
    providerInstances?: InstanceProviderInfo[];
}
```

#### listVcsProviders

Gets a list of available VCS providers.

**Method**: `POST`

**Action**: `listVcsProviders`

**Body**

```typescript
{}
```

**Response**

```typescript
{
    providers: {
        id: string;
        name: string;
    }[];
}
```

#### stopInstance

Stops the specified instance.

**Method**: `POST`

**Action**: `stopInstance`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{}
```

#### startInstance

Starts the specified instance.

**Method**: `POST`

**Action**: `startInstance`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{}
```

#### getInstanceProviderStatus

Gets the instance status from the provider.

**Method**: `POST`

**Action**: `getInstanceProviderStatus`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{
    status: InstanceProviderStatus;
    startTime?: number;
}
```

#### getInstance

Gets information about the specified instance.

**Method**: `POST`

**Action**: `getInstance`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{
    instance?: Instance;
    url?: string;
    error?: unknown;
}
```

#### restartInstance

Restarts the specified instance.

**Method**: `POST`

**Action**: `restartInstance`

**Body**

```typescript
{
    hash: string;
}
```

**Response**

```typescript
{
    hash: string;
}
```

#### listQueue

Gets a list of instances in the queue.

**Method**: `POST`

**Action**: `listQueue`

**Body**

```typescript
{}
```

**Response**

```typescript
{
    instances: Instance[];
}
```

#### getInstanceConfig

Gets the instance configuration.

**Method**: `POST`

**Action**: `getInstanceConfig`

**Body**

```typescript
{
    vcs: string;
    project: string;
    branch: string;
    instanceConfigName: string;
}
```

**Response**

```typescript
{
    config: FarmJsonConfig | undefined;
}
```

#### getInstancesConfigs

Gets a list of instance configuration names.

**Method**: `POST`

**Action**: `getInstancesConfigs`

**Body**

```typescript
{
    vcs: string;
    project: string;
    branch: string;
}
```

**Response**

```typescript
{
    configs: string[];
}
```

#### getProjectRepoUrl

Gets the project repository URL.

**Method**: `POST`

**Action**: `getProjectRepoUrl`

**Body**

```typescript
{
    project: string;
    vcs: string;
}
```

**Response**

```typescript
{
    url: string;
}
```

### GET /api/logs

Redirects to the instance build logs page.

**Params**

```
hash: string
```

### GET /log/:hash

Redirects to the instance execution logs page.

**Params**

```
hash: string
```

## Data Types

### Instance

```typescript
{
    branch: string;
    vcs: string;
    project: string;
    createdAt: string;
    status: 'queued' | 'generating' | 'generated' | 'deleting' | 'errored';
    hash: string;
    envVariables?: Record<string, string>;
    labels?: Record<string, string>;
    runEnvVariables?: Record<string, string>;
    urlTemplate?: string;
    description?: string;
    instanceConfigName: string;
}
```

### InstanceCommonStatus

```typescript
'queued' | 'generating' | 'generated' | 'deleting' | 'errored'
```

### InstanceProviderStatus

```typescript
'starting' | 'running' | 'stopped' | 'errored' | 'unhealthy' | 'unknown'
```

### InstanceProviderInfo

```typescript
{
    hash: string;
    status: InstanceProviderStatus;
    startTime: number;
}
```

### Output

```typescript
{
    command: string | null;
    stdout: string | null;
    stderr: string | null;
    duration: number | null;
    code: string | number | null;
}
```

### LogSpec

```typescript
{
    maxLines?: number;
    filter?: string;
}
```
