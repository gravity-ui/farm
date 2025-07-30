# Docker Farm Provider

**Конфигурация фермы**

```json
{
  "farmProvider": {
    "name": "docker",
    "config": {},
  }
}
```

## Конфигурация

### `network`
- *String*
- *Required*
> Рекомендуемое имя сети - `farm`

### `socketPath`
- *String*
- *Optional*
> Путь к сокету Docker. По умолчанию `/var/run/docker.sock`.

### `imageBuildVersion`
- *String*
- *Optional*
> Используйте `2` для включения BuildKit. (экспериментально, см. ограничения ниже).

**Неподдерживаемые функции:**
- Монтирование файлов/каталогов (включая секреты)
- Кэш-монтирования (RUN --mount=type=cache)
- Другие расширенные функции BuildKit

## Подготовка приложения

Создайте `.Dockerfile` для приложения, которое будет развернуто в Farm, и укажите его в `farm.json`.

```json
{
  "preview-generator": {
    "dockerfilePath": ".dockerfile"
  }
}
```

Вы можете переопределить команду запуска из `.Dockerfile` в `farm.json`

```json
{
  "preview-generator": {
    "start": {
      "command": "npm",
      "args": ["start"]
    }
  }
}
