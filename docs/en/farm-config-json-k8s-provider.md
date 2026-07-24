# K8s Farm Provider (WIP/DRAFT)

**Farm Configuration**

```json
{
  "farmProvider": {
    "name": "k8s",
    "config": {},
  }
}
```

## Config

### `namespace`
- *String*
- *Optional*
> Kubernetes namespace for Farm resources. Default is `farm`.

### `targetRepository`
- *String*
- *Required*
> Target Docker repository for built images.

### `buildkit`
- *Object*
- *Optional*
> Enables the rootless BuildKit build engine. When omitted, builds use the Docker engine (via the node Docker socket, `dockerSocketHostPath`). When present, builds run inside the builder pod via rootless BuildKit with ephemeral local storage and an external **registry** build cache, removing the dependency on the node Docker socket.
> - `image` (*String*, required): rootless BuildKit image, e.g. `moby/buildkit:v0.16.0-rootless` or a mirror in your registry. The existing `builderImage` is still used for the source checkout init container.
>
> The registry cache ref is derived from `targetRepository` as `<targetRepository>/<project>:buildcache` and exported with `mode=min`. Registry credentials (for both the image push and the cache push/pull) come from the node via `dockerCredsHostPath`.

### `dockerSocketHostPath`
- *String*
- *Optional*
> Host path to Docker socket for build operations. Used only by the legacy Docker build engine (when `buildkit` is not set).

### `dockerCredsHostPath`
- *String*
- *Optional*
> Host path to Docker credentials. Mounted into the builder for registry authentication (image push and, for the `buildkit` engine, build cache push/pull).

### `ingressClassName`
- *String*
- *Optional*
> Ingress class name for Farm instances.

### `ingressAnnotations`
- *Record<string, string>*
- *Optional*
> Additional annotations for Ingress resources.

### `ingressTlsSecretName`
- *String*
- *Optional*
> TLS secret name for Ingress.

### `dockerfilePath`
- *String*
- *Optional*
> Default Dockerfile path for instances.

### `builderImage`
- *String*
- *Required*
> Builder image to use for building applications.

### `builderEnvSecretName`
- *String*
- *Optional*
> Secret name containing environment variables for builder.

### `instanceEnvSecretName`
- *String*
- *Optional*
> Secret name containing environment variables for instances.

### `instancePort`
- *Number*
- *Optional*
> Default port for application instances.

### `instanceProbe`
- *Object*
- *Optional*
> Health check probe configuration for instances.

### `startBuilderTimeout`
- *Number*
- *Optional*
> Timeout for starting builder container in seconds.

### `startInstanceTimeout`
- *Number*
- *Optional*
> Timeout for starting instance in seconds.

### `buildTimeout`
- *Number*
- *Optional*
> Timeout for build operations in seconds.

### `builderResources`
- *Object*
- *Optional*
> Resource requirements for builder container.

### `instanceResources`
- *Object*
- *Optional*
> Resource requirements for application instances.

## App prepare

Create Dockerfile for your application and specify in `farm.json`.

```json
{
  "preview-generator": {
    "dockerfilePath": "Dockerfile"
  }
}
```

You may override instance configuration in `farm.json`

```json
{
  "preview-generator": {
    "instancePort": 3000,
    "instanceResources": {
      "requests": {
        "memory": "256Mi",
        "cpu": "250m"
      },
      "limits": {
        "memory": "512Mi",
        "cpu": "500m"
      }
    }
  }
}
