import type {Instance, InstanceProviderInfo, InstanceWithProviderStatus} from '../../shared/common';

export const mapInstanceWithProvider = (
    instance: Instance,
    providerInstances?: InstanceProviderInfo[],
): InstanceWithProviderStatus => {
    const providerInstance = providerInstances?.find(({hash}) => hash === instance.hash);

    if (!providerInstance) {
        return {
            ...instance,
            startTime: undefined,
            providerStatus: 'unknown',
        };
    }

    return {
        ...instance,
        startTime: providerInstance?.startTime,
        providerStatus: providerInstance?.status,
    };
};
