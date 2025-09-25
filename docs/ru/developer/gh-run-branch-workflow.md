# Как запустить workflow в ветке GitHub

Эта инструкция описывает, как запустить GitHub Actions workflow в конкретной ветке с помощью GitHub CLI (gh).

## Требования

- Установленный GitHub CLI (gh)
- Доступ к репозиторию с необходимыми правами
- Аутентификация в GitHub

## Установка GitHub CLI

Если у вас еще не установлен GitHub CLI, выполните команду:

```bash
brew install gh
```

Для других операционных систем следуйте [официальной инструкции по установке](https://github.com/cli/cli#installation).

## Авторизация

После установки необходимо авторизоваться в GitHub:

```bash
gh auth login
```

Следуйте инструкциям в интерактивном режиме для завершения процесса авторизации.

## Запуск workflow в ветке

Для запуска workflow в конкретной ветке используйте следующую команду:

```bash
gh workflow run build-docker-images.yml --ref branch-name
```

Где:
- `build-docker-images.yml` - имя файла workflow в директории `.github/workflows/`
- `branch-name` - имя ветки, в которой нужно запустить workflow

## Полезные опции

### Просмотр статуса workflow

Чтобы проверить статус запущенного workflow:

```bash
gh run list
```

### Просмотр логов workflow

Для просмотра логов конкретного запуска:

```bash
gh run view <run-id>
```

Где `<run-id>` - ID запуска workflow, который можно получить из команды `gh run list`.

### Просмотр доступных workflow

Чтобы увидеть список всех доступных workflow в репозитории:

```bash
gh workflow list
```

## Устранение неполадок

### Ошибка: "GH not authenticated"

Повторите процесс авторизации:

```bash
gh auth login
```

Или проверьте текущий статус авторизации:

```bash
gh auth status
