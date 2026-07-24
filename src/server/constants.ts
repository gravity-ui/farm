import nodePath from 'node:path';

// TODO(DakEnviy): Rewrite work with paths
export const WORKDIR_PATH = nodePath.resolve(process.env.FARM_WORKDIR ?? '/farm');
export const TEMP_PATH = 'farm-temp'; // TODO(DakEnviy): Add slash at the beginning
