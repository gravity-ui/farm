export enum DockerContainerState {
    Created = 'created',
    Restarting = 'restarting',
    Running = 'running',
    Removing = 'removing',
    Paused = 'paused',
    Exited = 'exited',
    Dead = 'dead',
}

export const FARM_DOCKER_ENTITY_PREFIX = 'farm-docker-';

export const DOCKER_PROXY_HOST = '127.0.0.1';
export const DOCKER_PROXY_PORT = Number(process.env.DOCKER_PROXY_PORT) || 3004;
