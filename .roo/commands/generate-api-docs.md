---
description: "Generate API documentation"
---

# Generate API Documentation

**Note:** This is not a Bash command and should not be executed in the terminal.

A command to generate or update API documentation for both Russian and English languages based on the application's source code.

## Purpose

This command is used to automatically generate or update API documentation for both Russian and English languages based on the application's source code files, such as route definitions, API action handlers, and shared type definitions. It ensures that the documentation stays up-to-date with the actual implementation.

**Key concept:**
- Source = Application source code (routes, actions, types) - drives changes
- Targets = API documentation files (`docs/ru/farm-api.md` and `docs/en/farm-api.md`) - get updated based on source

When generating/updating:
- Content is ADDED to Targets if it exists in Source but not in Targets
- Content is UPDATED in Targets if it exists in both Source and Targets but has changed in Source
- Content is REMOVED from Targets if it doesn't exist in Source
- Existing descriptions and non-automatically generated content in Targets are PRESERVED where possible

**Excluded endpoints:**
The following endpoints are excluded from documentation generation:
- `POST /webhook`
- `GET /__core/meta`
- `GET /error`
- `GET /create`
- `GET /ping`

## Logic of operation

1. Scans the source directory (`src`) for relevant files (routes, actions, types)
2. Analyzes the structure and implementation of the API
3. Parses route definitions to identify API endpoints
4. Parses API action handlers to understand request/response structures
5. Parses shared type definitions to document data structures
6. Generates or updates the Russian documentation file (`docs/ru/farm-api.md`)
7. Generates or updates the English documentation file (`docs/en/farm-api.md`)

For content modifications:
- Uses the `write_to_file` or `apply_diff` tool to create or update the documentation files
- Ensures that the generated documentation is accurate and complete

**Important**: The generation/update is unidirectional from Source to Targets. The Target files are updated based on the Source files, not vice versa. Automatically generated sections may be overwritten, but manually added content (if properly marked) should be preserved.

## Usage examples

```md
# Generate or update API documentation for both Russian and English
/generate-api-docs

# The command will automatically:
# 1. Read source files from `src/server/routes.ts`, `src/server/components/api-actions/`, `src/shared/api/`, `src/shared/common.ts`
# 2. Generate or update `docs/ru/farm-api.md`
# 3. Generate or update `docs/en/farm-api.md`
```

## Common scenarios

1. **Initial documentation generation**: When API documentation doesn't exist, this command can generate it from scratch based on the source code.

2. **Documentation update**: When the API changes (new endpoints, modified request/response structures), this command can update the existing documentation to reflect those changes.

3. **Multi-language documentation**: This command generates API documentation for both Russian and English languages, ensuring consistency across translations.

4. **Preserving custom content**: The command should be designed to preserve manually added descriptions or notes in the documentation, only updating the automatically generated parts.

5. **Integration with CI/CD**: This command can be integrated into the CI/CD pipeline to automatically update API documentation whenever the source code changes.
