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

### `dockerSocketHostPath`
- *String*
- *Optional*
> Host path to Docker socket for build operations.

### `dockerCredsHostPath`
- *String*
- *Optional*
> Host path to Docker credentials.

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
