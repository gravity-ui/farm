# Environment Variables

This document describes all environment variables used in the Farm project.

## General Variables

### SERVER_PORT
- **Purpose**: Port on which the server runs
- **Default**: Not set (socket is used)

### FARM_WORKDIR
- **Purpose**: Application working directory
- **Default**: `/farm`

## Database Variables

### FARM_DB_TYPE
- **Purpose**: Database type
- **Values**: `sqlite` or `postgres`
- **Default**: `sqlite`

### FARM_DB_FILE_PATH
- **Purpose**: Path to the SQLite database file (used only when `FARM_DB_TYPE=sqlite`)
- **Default**: `farm.db` in the project root directory

### FARM_DB_HOST
- **Purpose**: PostgreSQL server host (used only when `FARM_DB_TYPE=postgres`)
- **Default**: `localhost`

### FARM_DB_PORT
- **Purpose**: PostgreSQL server port (used only when `FARM_DB_TYPE=postgres`)
- **Default**: `5432`

### FARM_DB_USER
- **Purpose**: PostgreSQL username (used only when `FARM_DB_TYPE=postgres`)
- **Default**: `postgres`

### FARM_DB_PASSWORD
- **Purpose**: PostgreSQL user password (used only when `FARM_DB_TYPE=postgres`)
- **Default**: `postgres`

### FARM_DB_NAME
- **Purpose**: PostgreSQL database name (used only when `FARM_DB_TYPE=postgres`)
- **Default**: `farm`

## Configuration

### FARM_ENV_PATH
- **Purpose**: Path to the external configuration file
- **Default**: Not set

### NO_AUTH
- **Purpose**: Disables authentication
- **Values**: `true` or `false`
- **Default**: `false`

### UI_PORT
- **Purpose**: Port for the UI interface
- **Default**: Not set

## Docker-specific Variables

### DOCKER_PROXY_HOST
- **Purpose**: Docker proxy host
- **Default**: `127.0.0.1`

### DOCKER_PROXY_PORT
- **Purpose**: Docker proxy port
- **Default**: `3004`

### FARM_DEPLOYMENT_MODE (application level)
- **Purpose**: Deployment mode
- **Values**: `vm` or `docker_container`
- **Default**: Not set

### DOCKER_AUTH_CONFIG_FILE_PATH
- **Purpose**: Path to the Docker configuration file
- **Default**: `~/.docker/config.json`

## Git-specific Variables

### GIT_REPOSITORY_TOKEN
- **Purpose**: Token for accessing Git repository
- **Default**: Not set

Arbitrary environment variables are also supported for tokens by provider name.

## Farm Docker container Entrypoint

### FARM_DEPLOYMENT_MODE
- **Purpose**: Farm deployment mode
- **Values**: `vm` or `docker_container`
- **Default**: `docker_container`

### DOCKER_NETWORK
- **Purpose**: Docker network name for Farm containers
- **Default**: `farm`

### DOCKER_NETWORK_IPV6
- **Purpose**: Enables IPv6 support for Docker network
- **Values**: `true` or `false`
- **Default**: `true`

### DOCKER_NETWORK_SUBNET
- **Purpose**: Subnet for Docker network (IPv6)
- **Default**: `ad00::/8`

### DOCKER_FIXED_CIDR_V6
- **Purpose**: Fixed CIDR for IPv6
- **Default**: `fc00::/8`

### DOCKER_NETWORK_FLAGS
- **Purpose**: Flags for creating Docker network
- **Default**: `--driver=bridge --ipv6 --subnet=$DOCKER_NETWORK_SUBNET` (if IPv6 is enabled)

### DOCKER_PROXY_CONTAINER
- **Purpose**: Docker proxy container name
- **Default**: `farm-docker-proxy`

### DOCKER_PROXY_NGINX_TAG
- **Purpose**: nginx image tag for proxy
- **Default**: `latest`

### DOCKER_PROXY_PORT
- **Purpose**: Docker proxy port
- **Default**: `3004`

### DOCKER_PROXY_NGINX_CONF_SRC
- **Purpose**: Path to nginx config for proxy
- **Default**: `/opt/nginx/docker-proxy.conf`

### DOCKER_RUNNING_CHECK_INTERVAL
- **Purpose**: Docker startup check interval (in seconds)
- **Default**: `3`

### DOCKER_REGISTRY
- **Purpose**: Docker registry
- **Default**: `ghcr.io`

### DOCKER_LOGIN
- **Purpose**: Login for Docker registry
- **Default**: Not set

### DOCKER_PWD
- **Purpose**: Password for Docker registry
- **Default**: Not set

### DOCKER_NETWORK_IPV6_DNS_ADDRESS
- **Purpose**: DNS address for IPv6 network
- **Default**: Not set (required when IPv6 is enabled)
