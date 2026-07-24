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

### `buildkit`
- *Object*
- *Optional*
> Включает движок сборки на rootless BuildKit. Если блок не задан — сборка идёт через Docker-движок (docker-сокет ноды, `dockerSocketHostPath`). Если задан — сборка выполняется внутри builder-пода через rootless BuildKit с эфемерным локальным хранилищем и внешним **registry**-кэшом, что убирает зависимость от docker-сокета ноды.
> - `image` (*String*, обязательно): образ rootless BuildKit, например `moby/buildkit:v0.16.0-rootless` или его зеркало в вашем реестре. Существующий `builderImage` по-прежнему используется для init-контейнера checkout исходников.
>
> Ref registry-кэша выводится из `targetRepository` как `<targetRepository>/<project>:buildcache` и экспортируется с `mode=min`. Учётные данные реестра (и для push образа, и для push/pull кэша) берутся с ноды через `dockerCredsHostPath`.

### `dockerSocketHostPath`
- *String*
- *Optional*
> Путь к сокету Docker на хосте для операций сборки. Используется только устаревшим Docker-движком (когда `buildkit` не задан).

### `dockerCredsHostPath`
- *String*
- *Optional*
> Путь к учетным данным Docker на хосте. Монтируется в builder для аутентификации в реестре (push образа и, для движка `buildkit`, push/pull кэша сборки).

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
