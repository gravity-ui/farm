ARG BASE_IMAGE=ghcr.io/gravity-ui/node-nginx:ubuntu22-nodejs20-full.2025-01-24

FROM $BASE_IMAGE AS base
WORKDIR /opt/app

# Use the same pinned pnpm in the build and runtime images.
COPY package.json ./
RUN corepack enable && corepack install

FROM base AS build-stage
ENV CI=true

COPY dist/public dist/public
COPY pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json app-builder.config.ts ./
COPY .husky/install.mjs .husky/install.mjs
COPY src ./src
RUN --mount=type=cache,id=farm-pnpm,target=/pnpm/store <<EOT
    set -e
    pnpm run deps:ci --store-dir=/pnpm/store
    pnpm run build
    rm -rf node_modules
    pnpm install --prod --offline --frozen-lockfile --store-dir=/pnpm/store --package-import-method=copy
EOT

FROM base

COPY --from=build-stage /opt/app/ /opt/app/
COPY ./scripts /opt/app/scripts

RUN <<EOT
    set -e
    mkdir /farm
    mkdir -p /opt/logs
    apt update
    apt install -y python3 python-is-python3 git curl wget nano net-tools iproute2 dnsutils iputils-ping
    # docker install
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    # docker entrypoint permissions
    chmod +x /opt/app/scripts/docker/docker-entrypoint.sh
EOT

ENV NODE_ENV=production
ENV farmEntrypoint="./scripts/docker/docker-entrypoint.sh"

CMD ["/bin/bash", "-c", "$farmEntrypoint"]
