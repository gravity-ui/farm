import type {FarmJsonConfig} from '../../server/utils/farmJsonConfig';

export interface GetInstanceConfigRequest {
    vcs: string;
    project: string;
    branch: string;
    instanceConfigName: string;
}

export interface GetInstanceConfigResponse {
    config: FarmJsonConfig | undefined;
}
