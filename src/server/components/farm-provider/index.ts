import type {FarmConfig} from '../../models/farmConfig';
import {getGlobalFarmConfig} from '../../utils/common';
import {coreRegistry} from '../core-plugin-registry';
import {getNodeKit} from '../node-kit';

import type {BaseFarmProvider} from './base-provider';
import {getFarmInternalAPI} from './internal-api-for-providers';

const configuredProvider: Required<FarmConfig>['farmProvider'] | undefined =
    getGlobalFarmConfig().farmProvider;

export function getFarmProvider(
    providerName: string | undefined = configuredProvider?.name,
): BaseFarmProvider {
    const providers = coreRegistry.farmProviders.getPlugins();
    getNodeKit().ctx.log('Available farm providers:', {
        providers: Object.keys(providers),
    });

    if (!providerName) {
        throw new Error('Farm provider name must be explicitly specified in configuration');
    }

    let providerInstance = coreRegistry.farmProviders.getInstance(providerName);
    const config =
        configuredProvider?.name === providerName ? configuredProvider.config : undefined;

    if (!providerInstance) {
        providerInstance = providers[providerName]?.constructor({
            internalApi: getFarmInternalAPI(),
            config,
        });

        if (!providerInstance) {
            throw new Error(`Farm provider '${providerName}' not found`);
        }

        coreRegistry.farmProviders.setInstance(providerName, providerInstance);
    }

    return providerInstance;
}
