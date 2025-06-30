import type {AppConfig} from '@gravity-ui/nodekit';

export type PrivateConfigType = {
    authProvider?: string;
};

export type FarmServerConfigType = AppConfig & PrivateConfigType;

const SERVER_PORT = process.env.SERVER_PORT;

export const defaultFarmServerConfig: FarmServerConfigType = {
    appName: 'farm',
    appPort: SERVER_PORT ? parseInt(SERVER_PORT, 10) : undefined,
    appSocket: SERVER_PORT ? undefined : 'dist/run/server.sock',
    appVersion: process.env.npm_package_version,
};

export default defaultFarmServerConfig;
