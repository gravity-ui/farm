# Docker Farm Provider

**Farm Configuration**

```json
{
  "farmProvider": {
    "name": "docker",
    "config": {},
  }
}
```

## Config

### `network`
- *String*
- *Required*
> Recommended network name is `farm`

### `socketPath`
- *String*
- *Optional*
> Docker socket path. Default is `/var/run/docker.sock`.

### `imageBuildVersion`
- *String*
- *Optional*
> Use `2` to enable BuildKit.  (experimental, see limitations below).

**Not supported features:**
- File/directory mounting (including secrets)
- Cache mounts (RUN --mount=type=cache)
- Other advanced BuildKit features

### `maintenanceCronTime`
- *String*
- *Optional*
> Cron expression for maintenance scheduling. Default is `0 3 * * *` (every day at 3 a.m.)

## App prepare

Make `.Dockerfile` for app to deploy in Farm and specify in `farm.json`.

```json
{
  "preview-generator": {
    "dockerfilePath": ".dockerfile"
  }
}
```

You may override `.Dockerfile` start command in `farm.json`

```json
{
  "preview-generator": {
    "start": {
      "command": "npm",
      "args": ["start"]
    }
  }
}
