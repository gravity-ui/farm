# Continuous Integration

## Generating application instances in pull requests

To generate an application instance in a pull request, you can either set up a webhook in GitHub or send a similar request from your CI systems using the example below:

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

It should be clarified that the event header may vary in different systems. It should be specified in the configuration, details in the [`Farm configuration`](./farm-config-json.md) description in the `vcsCredentials` section.
