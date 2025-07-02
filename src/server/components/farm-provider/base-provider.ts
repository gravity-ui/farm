import type {SubscriptionObserver} from 'observable-fns';

import type {
    Instance,
    InstanceProviderInfo,
    InstanceProviderStatus,
    LogSpec,
} from '../../../shared/common';
import type {GenerateInstanceData, InstanceObservableEmitValue} from '../../models/common';
import type {ErrLogger, Logger} from '../node-kit';

export interface FarmInternalApi {
    getExternalInstance: (hash: string) => Promise<Instance | undefined>;
    getExternalInstances: () => Promise<Instance[]>;
    log: Logger;
    logError: ErrLogger;
}

export interface LogParams extends Partial<LogSpec> {
    // TODO(golbahsg): Looks like it is unused
    disabled?: boolean;
}

export class BaseFarmProvider {
    declare protected farmInternalApi: FarmInternalApi;

    constructor(farmInternalApi: FarmInternalApi, _config?: Record<string, any>) {
        this.farmInternalApi = farmInternalApi;
    }

    startup(): Promise<void> {
        throw new Error('Called not implemented method');
    }

    buildInstance(
        _generateData: GenerateInstanceData,
        _observer: SubscriptionObserver<InstanceObservableEmitValue>,
    ): Promise<void> {
        throw new Error('Called not implemented method');
    }

    stopBuilder(_hash: string): Promise<void> {
        throw new Error('Called not implemented method');
    }

    startInstance(_instance: Instance): Promise<void> {
        throw new Error('Called not implemented method');
    }

    stopInstance(_hash: string): Promise<void> {
        throw new Error('Called not implemented method');
    }

    // TODO(golbahsg): Think about using only hashes here and other methods
    restartInstance(_instance: Instance): Promise<void> {
        throw new Error('Called not implemented method');
    }

    deleteInstance(_hash: string): Promise<void> {
        throw new Error('Called not implemented method');
    }

    getInstanceStatus(_instance: Instance): Promise<InstanceProviderStatus> {
        throw new Error('Called not implemented method');
    }

    getInstances(): Promise<Array<InstanceProviderInfo>> {
        throw new Error('Called not implemented method');
    }

    getInstanceLogs(_params: {
        hash: string;
        stdout?: LogParams;
        stderr?: LogParams;
    }): Promise<{stdout?: string; stderr?: string}> {
        throw new Error('Called not implemented method');
    }
}
