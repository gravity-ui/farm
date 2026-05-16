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
> Ms time after which instance will be stopped. Default is 1 hour. This value is used if a specific instance does not have its own `stopTimeout` set. If set to `-1`, instances will live forever (automatic stopping is disabled).

### `instanceDeleteTimeout`
- *Number*
- *Optional*
> Ms after creation after which only **generated** instances are removed (same lifecycle status as when stopped: rows stay `generated` in DB). Default is **30 days** when omitted. Instances the provider still reports as **running** are not queued for deletion. Set to `0` or a negative value to turn off automatic deletion.

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

### `instanceHashLength`
- *Number*
- *Optional*
> Maximum length of instance hash. If set, the hash is truncated to this length. Minimum value is 4; when not set, no truncation is applied.

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


