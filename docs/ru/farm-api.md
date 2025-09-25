# Farm API

## Общая информация

API Farm предоставляет интерфейс для управления инстансами, проектами и другими ресурсами системы. Все API-эндпоинты возвращают данные в формате JSON.

## Эндпоинты

### POST /api/generate

Создает новый инстанс.

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

Универсальный эндпоинт для выполнения различных действий. Доступные действия перечислены ниже.

#### listProjects

Получает список всех проектов.

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

Ищет проекты по шаблону имени.

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

Получает список инстансов для указанного проекта.

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

Удаляет указанный инстанс.

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

Удаляет несколько инстансов.

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

Получает логи сборки для указанного инстанса.

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

Получает логи выполнения для указанного инстанса.

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

Получает список веток для указанного проекта.

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

Получает список инстансов от провайдера.

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

Получает список доступных VCS провайдеров.

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

Останавливает указанный инстанс.

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

Запускает указанный инстанс.

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

Получает статус инстанса от провайдера.

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

Получает информацию об указанном инстансе.

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

Перезапускает указанный инстанс.

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

Получает список инстансов в очереди.

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

Получает конфигурацию инстанса.

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

Получает список имен конфигураций инстансов.

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

Получает URL репозитория проекта.

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

Перенаправляет на страницу логов сборки инстанса.

**Params**

```
hash: string
```

### GET /log/:hash

Перенаправляет на страницу логов выполнения инстанса.

**Params**

```
hash: string
```

## Типы данных

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
