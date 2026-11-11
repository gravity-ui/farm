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
    commit?: string;
    vcs: string;
    description?: string;
    urlTemplate?: string;
    instanceConfigName?: string;
    labels?: Record<string, string>;
    stopTimeout?: number;
    [key: string]: unknown;
}
```

`commit` is an optional VCS-specific revision identifier. It selects the source and configuration
revision for checkout but does not affect the instance hash or URL. Git requires a full 40- or
64-character hexadecimal commit hash. Without `commit`, Farm checks out `branch` as before.

#### Git references

For `vcs: 'git'`, `branch` accepts a plain branch name (`main`, `feature/x`), an explicit branch (`refs/heads/<name>`), or a tag (`refs/tags/<name>`). A plain name selects a branch, not a tag. To select a branch whose literal name starts with `refs/heads/` or `refs/tags/`, prepend `refs/heads/` to that name.

These prefixes apply only to Git. Other VCS plugins define their own reference formats. Farm stores the supplied `branch` value unchanged and includes it in the instance hash, so `main` and `refs/heads/main` create different instances. An explicit `commit` selects the checkout revision without changing this hash rule.

**Response**

```typescript
{
    hash: string;
}
```

Invalid parameters return HTTP 400 with the invalid field names:

```typescript
{
    message: string;
    fields?: string[];
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
    refType?: 'branch' | 'tag';
    query?: string;
}
```

For GitHub projects, `refType` defaults to `branch`; use `tag` to list tags. Without `query`, the result contains up to 30 references. `query` performs an exact name lookup beyond the recent list and accepts at most 1024 characters. Returned names have no `refs/heads/` or `refs/tags/` prefix; use the [Git reference rules](#git-references) when passing them as `branch`. Invalid request parameters return HTTP 400.

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

#### touchInstance

Records instance activity for idle timeout calculation when `instanceActivityTrackingEnabled` is enabled. Otherwise the action succeeds without updating activity. The caller must exclude health checks and limit the request rate.

**Method**: `POST`

**Action**: `touchInstance`

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
    commit?: string;
    instanceConfigName: string;
}
```

The `branch` field follows the [Git reference rules](#git-references) for `vcs: 'git'`.

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
    commit?: string;
}
```

The `branch` field follows the [Git reference rules](#git-references) for `vcs: 'git'`.

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
    commit?: string;
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
    stopTimeout?: number;
    lastActivityAt?: number;
}
```

`branch` stores the original reference, including any prefix. See [Git references](#git-references).

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
