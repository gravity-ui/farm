import {ExpressKit} from '@gravity-ui/expresskit';
import {expressCspHeader} from 'express-csp-header';

import {coreRegistry} from './components/core-plugin-registry';
import {getNodeKit} from './components/node-kit';
import type {FarmServerConfigType} from './configs/common';
import {getRoutes} from './routes';

let appInstance: ExpressKit | null = null;

export function getServerApp(): ExpressKit {
    if (!appInstance) {
        const {appName, appEnv, appInstallation, appDevMode, appVersion, appAuthPolicy} =
            getNodeKit().config as FarmServerConfigType;

        getNodeKit().ctx.log('AppConfig', {
            appName,
            appEnv,
            appInstallation,
            appDevMode,
            appVersion,
            appAuthPolicy,
        });

        appInstance = new ExpressKit(getNodeKit(), getRoutes());
        appInstance.express.use(
            expressCspHeader({directives: coreRegistry.cspDirectives.getConfiguration()}),
        );
    }
    return appInstance;
}
