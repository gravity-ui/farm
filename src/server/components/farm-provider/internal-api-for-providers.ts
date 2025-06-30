import {getInstance, listInstances} from '../../utils/db';
import {getNodeKit} from '../node-kit';

import type {FarmInternalApi} from './base-provider';

let farmInternalApiInstance: FarmInternalApi | null = null;

export function getFarmInternalAPI(): FarmInternalApi {
    if (!farmInternalApiInstance) {
        farmInternalApiInstance = {
            getExternalInstance: getInstance,
            getExternalInstances: listInstances,
            log: getNodeKit().ctx.log.bind(getNodeKit().ctx),
            logError: getNodeKit().ctx.logError.bind(getNodeKit().ctx),
        };
    }
    return farmInternalApiInstance;
}
