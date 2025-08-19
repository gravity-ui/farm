import type {ImageBuildOptions} from 'dockerode';

import type {HealthcheckConfig} from '../../../utils/healthcheck';

export interface DockerInstanceHealthcheck extends HealthcheckConfig {
    port: number;
    path: string;
}

export interface FarmDockerProviderConfig {
    network: string;
    socketPath?: string;
    instanceHealthcheck?: DockerInstanceHealthcheck;
    imageBuildVersion?: ImageBuildOptions['version'];
    maintenanceCronExpression?: string;
}
