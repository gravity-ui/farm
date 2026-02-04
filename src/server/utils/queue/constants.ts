import {getGlobalFarmConfig} from '../common';

export const BUILDS_LIMIT = getGlobalFarmConfig().maxConcurrentBuilds || 3;

export const MAX_BUILD_RESTARTS = getGlobalFarmConfig().maxBuildRestarts || 3;
