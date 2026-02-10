import {getGlobalFarmConfig} from '../common';

export const BUILDS_LIMIT = getGlobalFarmConfig().maxConcurrentBuilds || 3;

export const INSTANCE_HASH_LENGTH = getGlobalFarmConfig().instanceHashLength;
