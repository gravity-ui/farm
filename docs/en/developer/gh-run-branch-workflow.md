# How to run a workflow in a GitHub branch

This guide describes how to run a GitHub Actions workflow in a specific branch using GitHub CLI (gh).

## Requirements

- Installed GitHub CLI (gh)
- Access to the repository with necessary permissions
- Authentication in GitHub

## Installing GitHub CLI

If you don't have GitHub CLI installed yet, run the command:

```bash
brew install gh
```

For other operating systems, follow the [official installation instructions](https://github.com/cli/cli#installation).

## Authentication

After installation, you need to authenticate in GitHub:

```bash
gh auth login
```

Follow the instructions in interactive mode to complete the authentication process.

## Running workflow in a branch

To run a workflow in a specific branch, use the following command:

```bash
gh workflow run build-docker-images.yml --ref branch-name
```

Where:
- `build-docker-images.yml` - the name of the workflow file in the `.github/workflows/` directory
- `branch-name` - the name of the branch where you want to run the workflow

## Useful options

### Viewing workflow status

To check the status of a running workflow:

```bash
gh run list
```

### Viewing workflow logs

To view logs of a specific run:

```bash
gh run view <run-id>
```

Where `<run-id>` is the ID of the workflow run, which you can get from the `gh run list` command.

### Viewing available workflows

To see a list of all available workflows in the repository:

```bash
gh workflow list
```

## Troubleshooting

### Error: "GH not authenticated"

Repeat the authentication process:

```bash
gh auth login
```

Or check the current authentication status:

```bash
gh auth status
