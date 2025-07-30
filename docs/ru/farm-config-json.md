# Конфигурация Farm

### `projects`
- *Record<string, FarmConfig>* - без `farmProvider`, `projects`.
- *Required*
- Только глобально
> Список проектов и переопределения конфигурации.

### `defaultProject`
- *String*
- *Required*
- Только глобально
> Проект по умолчанию.

### `repositoryPath`
- *String*
- *Required*
> Путь к репозиторию. Пример: `data-ui/farm`.

Формат Git репозитория: `https://<token>@github.com/<repositoryPath>.git`.

### `instanceStopTimeout`
- *Number*
- *Optional*
> Время в мс, по истечении которого инстанс будет остановлен. По умолчанию 1 час.

### `instanceDeleteTimeout`
- *Number*
- *Optional*
> Время в мс, по истечении которого только **сгенерированные** инстансы будут удалены. По умолчанию не установлено (инстансы **не будут** удалены)

### `urlTemplate`
- *String*
- *required* для проекта, *optional* для глобального.
> Шаблон URL инстанса по умолчанию. Пример: `https://{hash}.farm.project.com`
>
> Доступные теги: `{hahs}`, `{project}`.

### `autoStartDelay`
- *Number*
- *Optional*
> Время в мс, по истечении которого инстанс будет запущен в UI. По умолчанию 1 сек.

### `maxConcurrentBuilds`
- *Number*
- *Optional*
> Максимальное количество одновременных сборок. По умолчанию 3.

### `maxRunningInstances`
- *Number*
- *Optional*
> Максимальное количество запущенных инстансов. По умолчанию без ограничения. Когда лимит достигнут, новые сборки будут отклонены.

### `defaultBranch`
- *String*
- *Required*
> Ветка VCS по умолчанию.

### `vcs`
- *String*
- *Required*
> Тип VCS "git".

### `vcsCredentials`
- *Object*
- *Optional*
> Конфигурация для учетных данных VCS.
>
> Пример для GitHub:
> ```json
> {
>   "git": {
>     "hostname": "github.com",
>     "authTokenEnvName": "GITHUB_TOKEN",
>     "webhookEventNameHeader": "X-GitHub-Event"
>   }
> }
> ```

> Будет использоваться для git clone https://`{token}`@`{hostname}`/`{repositoryPath}`.git

> Webhook с заголовком `X-GitHub-Event` будет связан с Git провайдером.

**Значения по умолчанию**:
  - *authTokenEnvName*
    - `GIT_REPOSITORY_TOKEN`, `GH_TOKEN`
  - *webhookEventNameHeader*
    - *git*
      - `x-github-event`
  - *hostname*
    - *git*
      - `github.com`

### `monoRepoPath`
- *String*
- *Optional*
> Будет добавлен к пути перед работой с кодом приложения.

### `farmProvider`
- *Object*
- *Required*
> Конфигурация провайдера. Подробнее в документации провайдера.
