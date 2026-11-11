import {getInstance, listInstances} from '../../utils/db';
import {maskSecrets, normalizeInstanceEnv} from '../../utils/secret-env';
import {getNodeKit} from '../node-kit';

import type {FarmInternalApi} from './base-provider';

let farmInternalApiInstance: FarmInternalApi | null = null;

export function getFarmInternalAPI(): FarmInternalApi {
    if (!farmInternalApiInstance) {
        farmInternalApiInstance = {
            getExternalInstance: async (hash) => {
                const instance = await getInstance(hash);
                return instance ? normalizeInstanceEnv(instance) : undefined;
            },
            getExternalInstances: async () => (await listInstances()).map(normalizeInstanceEnv),
            log: (...args) => getNodeKit().ctx.log(...maskSecrets({log: args}).log),
            logError: (...args) => getNodeKit().ctx.logError(...maskSecrets({log: args}).log),
        };
    }
    return farmInternalApiInstance;
}
