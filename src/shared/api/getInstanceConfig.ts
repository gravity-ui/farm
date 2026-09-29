import type {FarmJsonConfig} from '../../server/utils/farmJsonConfig';

export interface GetInstanceConfigRequest {
    vcs: string;
    project: string;
    branch: string;
    commit?: string;
    instanceConfigName: string;
}

export interface GetInstanceConfigResponse {
    config: FarmJsonConfig | undefined;
}
