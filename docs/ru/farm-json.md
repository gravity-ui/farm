# farm.json

### `preview-generator`
- *Configuration*
- *Required*
> Корень конфигурации.
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
> Вы можете описать несколько инстансов конфигураций. Используйте `name` для каждой конфигурации. При генерации используйте `instanceConfigName` в webhook запросе.

### `preview-generator.instances.[].name`
- *String*
- *Required*
> Название инстанса конфигурации.

### ...

> **Следующие свойства могут использоваться на глобальном уровне и для каждой внутренней конфигурации. Свойства внутренней конфигурации переопределяют свойства глобальной конфигурации.**

> **`.prop` = `preview-generator.prop` AND `preview-generator.instances.[].prop`**

### `.start`
- *{ command: string; args: string; }*
- *Optional*
- Provider: `docker`
> Пример: `{ command: 'npm', args: 'start' }`

### `.urlTemplate`
- *String*
- *Optional*
> Шаблон URL ынса приложения, переопределяет глобальный шаблон URL. Пример: `{hash}.farm.project.com`.

### `.env`
- *Record<string, string>*
- *Optional*
> Переменные окружения для инстанса приложения. При сборке и запуске.

### `.runEnv`
- *Record<string, string>*
- *Optional*
> Переменные окружения для инстанса приложения. Только при запуске.

### `.envInheritance`
- *Record<string, string>*
- *Optional*
- Provider: `docker`
> Правила наследования переменных окружения. Если FarmApp запущен в docker, то передать переменные окружения в контейнер.
>
> `Key` - это имя переменной окружения для приложения, `Value` - это имя переменной окружения на хосте/в контейнере. Может быть полезно для передачи секретов в контейнер приложения.

```json
{
  "app_env_name": "host_env_name"
}
```

### `.dockerfilePath`
- *String*
- *Required*
- Provider: `k8s`, `docker`
> Путь к Dockerfile. Относительно корня кода приложения.

### `.dockerfileContextPath`
- *String*
- *Optional*
- Provider: `docker`
> По умолчанию `.`

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

