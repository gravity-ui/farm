import type {FarmConfig} from '../../models/farmConfig';

const conf = process.env.APP_DEV_MODE ? require('./dev') : require('./external');

/** @deprecated Do not use this directly, use getProjectFarmConfig utils */
export const envConfig = (conf?.default || conf) as FarmConfig;
