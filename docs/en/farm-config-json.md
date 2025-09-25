# Farm configuration

### `projects`
- *Record<string, FarmConfig>* - omit `farmProvider`, `projects`.
- *Required*
- Only global
> List of projects and configuration overrides.

### `defaultProject`
- *String*
- *Required*
- Only global
> Default project.

### `repositoryPath`
- *String*
- *Required*
> Repository path. Example: `data-ui/farm`.

Git repository format: `https://<token>@github.com/<repositoryPath>.git`.

### `instanceStopTimeout`
- *Number*
- *Optional*
> Ms time after which instance will be stopped. Default is 1 hour.

### `instanceDeleteTimeout`
- *Number*
- *Optional*
> Ms time after which only **generated** instances will be removed. Default is unset (instances will **not** be removed)

### `urlTemplate`
- *String*
- *required* for project, *optional* for global.
> Default instance url template. Example: `https://{hash}.farm.project.com`
>
> Available tags: `{hahs}`, `{project}`.

### `autoStartDelay`
- *Number*
- *Optional*
> Ms time after which instance will be started in UI. Default is 1 sec.

### `maxConcurrentBuilds`
- *Number*
- *Optional*
> Maximum number of concurrent builds. Default is 3.

### `maxRunningInstances`
- *Number*
- *Optional*
> Maximum number of running instances. No limit by default. When limit is reached, new builds will be rejected.

### `defaultBranch`
- *String*
- *Required*
> Default VCS branch.

### `vcs`
- *String*
- *Required*
> VCS type "git".

### `vcsCredentials`
- *Object*
- *Optional*
> Configuration for VCS credentials.
>
> Example for GitHub:
> ```json
> {
>   "git": {
>     "hostname": "github.com",
>     "authTokenEnvName": "GITHUB_TOKEN",
>     "webhookEventNameHeader": "X-GitHub-Event"
>   }
> }
> ```

> Will be used for git clone https://`{token}`@`{hostname}`/`{repositoryPath}`.git

> Webhook with `X-GitHub-Event` header will be associate with Git provider.

**Default values**:
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
> Will be added to path before work with code of application.

### `farmProvider`
- *Object*
- *Required*
> Provider configuration. Read more in Provider documentation.
> - [Docker](./farm-config-json-docker-provider.md)
> - [K8s](./farm-config-json-k8s-provider.md)


