import type {InstanceProviderStatus} from '../../shared/common';

import type {HealthcheckStatus} from './healthcheck';

export const normalizeInstanceProviderStatus = (
    providerStatus: InstanceProviderStatus,
    healthcheckStatus: HealthcheckStatus,
): InstanceProviderStatus => {
    if (providerStatus !== 'running') {
        return providerStatus;
    }

    if (healthcheckStatus === 'healthy') {
        return 'running';
    }

    if (healthcheckStatus === 'unhealthy') {
        return 'unhealthy';
    }

    return 'starting';
};
