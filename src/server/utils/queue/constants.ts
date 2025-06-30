import {getGlobalFarmConfig} from '../common';

export const BUILDS_LIMIT = getGlobalFarmConfig().maxConcurrentBuilds || 3;
