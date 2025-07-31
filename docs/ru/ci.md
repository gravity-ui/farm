# Continuous Integration

## Генерация инстанса приложения в пул реквесте

Для генерации инстанса приложения в пул реквесте вы можете либо настроить вебхук в GitHub, либо отправить подобный запрос из своих CI систем, используя пример ниже:

```bash
curl -X POST "https://farm.domain/webhook" \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -d '{
  "action": "opened",
  "pull_request": {
    "title": "feat: add new feature",
    "body": "This PR adds a new feature to the application",
    "head": {
      "ref": "feature/new-feature"
    },
    "base": {
      "ref": "main"
    },
    "number": 123,
    "user": {
      "login": "developer"
    }
  },
  "repository": {
    "full_name": "owner/project-name"
  }
}'
```

Стоит уточнить, что заголовок события может быть разным в разных системах. Его стоит уточнить в конфигурации, подробности в описании [`конфигурации Фермы`](./farm-config-json.md) в разделе `vcsCredentials`.
