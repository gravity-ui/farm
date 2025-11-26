# farm.json

### `preview-generator`
- *Configuration*
- *Required*
> Configuration root.
```json
{
  "preview-generator": {
    ...
  }
}
```

### `preview-generator.instances`
- *Configuration[]*
- *Optional*
> You may describe multiple instance configurations. Use `name` for each configuration. When generating, use `instanceConfigName` in the webhook request.

### `preview-generator.instances.[].name`
- *String*
- *Required*
> Instance configuration name.

### ...

> **The following properties can be used at the global level and for each inner configuration. Inner configuration properties override global configuration properties.**

> **`.prop` = `preview-generator.prop` AND `preview-generator.instances.[].prop`**

### `.start`
- *{ command: string; args: string; }*
- *Optional*
- Provider: `docker`
> Example: `{ command: 'npm', args: 'start' }`

### `.urlTemplate`
- *String*
- *Optional*
> Application instance URL template, overrides global URL template. Example: `{hash}.farm.project.com`.

### `.env`
- *Record<string, string>*
- *Optional*
> Environment variables for application instance. On Build and Run.

### `.runEnv`
- *Record<string, string>*
- *Optional*
> Environment variables for application instance. On Run only.

### `.protectedEnv`
- *String[]*
- *Optional*
> List of protected environment variable names that cannot be overridden when creating an instance.
>
> If a user tries to create an instance with environment variables from this list, the build will be rejected with an error.
>
> Example:
> ```json
> {
>   "protectedEnv": ["DATABASE_URL", "SECRET_KEY", "API_TOKEN"]
> }
> ```

### `.envInheritance`
- *Record<string, string>*
- *Optional*
- Provider: `docker`
> Rules for inheriting environment variables. If FarmApp is running in docker, then pass environment variables to the container.
>
> `Key` is the environment variable name for the application, `Value` is the environment variable name on the host/in the container. Can be useful for passing secrets to the application container.

```json
{
  "app_env_name": "host_env_name"
}
```

### `.dockerfilePath`
- *String*
- *Required*
- Provider: `k8s`, `docker`
> Dockerfile path. Relative to app code root.

### `.dockerfileContextPath`
- *String*
- *Optional*
- Provider: `docker`
> Default is `.`

### `.startInstanceTimeout`
- *Number*
- *Optional*
- Provider: `k8s`, `docker`

### `.buildTimeout`
- *Number*
- *Optional*
- Provider: `k8s`, `docker`

### `.dockerInstanceHealthcheck`
- *Object*
- *Optional* (Default in example below)
- Provider: `docker`

```json
{
  "port": 80,
  "path": "/"
}
```
