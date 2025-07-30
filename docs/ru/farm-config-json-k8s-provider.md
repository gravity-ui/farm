# K8s Farm Provider (WIP/DRAFT)

**Конфигурация фермы**

```json
{
  "farmProvider": {
    "name": "k8s",
    "config": {},
  }
}
```

## Конфигурация

### `namespace`
- *String*
- *Optional*
> Пространство имен Kubernetes для ресурсов Farm. По умолчанию `farm`.

### `targetRepository`
- *String*
- *Required*
> Целевой Docker репозиторий для собранных образов.

### `dockerSocketHostPath`
- *String*
- *Optional*
> Путь к сокету Docker на хосте для операций сборки.

### `dockerCredsHostPath`
- *String*
- *Optional*
> Путь к учетным данным Docker на хосте.

### `ingressClassName`
- *String*
- *Optional*
> Имя класса Ingress для инстансов Farm.

### `ingressAnnotations`
- *Record<string, string>*
- *Optional*
> Дополнительные аннотации для ресурсов Ingress.

### `ingressTlsSecretName`
- *String*
- *Optional*
> Имя секрета TLS для Ingress.

### `dockerfilePath`
- *String*
- *Optional*
> Путь к Dockerfile по умолчанию для инстансов.

### `builderImage`
- *String*
- *Required*
> Образ для сборки приложений.

### `builderEnvSecretName`
- *String*
- *Optional*
> Имя секрета, содержащего переменные окружения для сборщика.

### `instanceEnvSecretName`
- *String*
- *Optional*
> Имя секрета, содержащего переменные окружения для инстансов.

### `instancePort`
- *Number*
- *Optional*
> Порт по умолчанию для инстансов приложений.

### `instanceProbe`
- *Object*
- *Optional*
> Конфигурация проверки работоспособности для инстансов.

### `startBuilderTimeout`
- *Number*
- *Optional*
> Таймаут для запуска контейнера сборщика в секундах.

### `startInstanceTimeout`
- *Number*
- *Optional*
> Таймаут для запуска инстанса в секундах.

### `buildTimeout`
- *Number*
- *Optional*
> Таймаут для операций сборки в секундах.

### `builderResources`
- *Object*
- *Optional*
> Требования к ресурсам для контейнера сборщика.

### `instanceResources`
- *Object*
- *Optional*
> Требования к ресурсам для инстансов приложений.

## Подготовка приложения

Создайте Dockerfile для вашего приложения и укажите его в `farm.json`.

```json
{
  "preview-generator": {
    "dockerfilePath": "Dockerfile"
  }
}
```

Вы можете переопределить конфигурацию инстанса в `farm.json`

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
