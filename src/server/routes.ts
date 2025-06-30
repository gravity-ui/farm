import type {AppRoutes} from '@gravity-ui/expresskit';
import {AuthPolicy} from '@gravity-ui/expresskit';

import {getNodeKit} from './components/node-kit';
import handleApiActions from './controllers/api';
import {generate} from './controllers/generate';
import handleMain from './controllers/main';
import handleMetaInfo from './controllers/meta-info';
import handlePing from './controllers/ping';
import handleWebhook from './controllers/webhook';

let routesInstance: AppRoutes | null = null;

export function getRoutes(): AppRoutes {
    if (!routesInstance) {
        const disabledPolicy = {
            authPolicy: AuthPolicy.disabled,
        };

        const authPolicy = {
            authPolicy: getNodeKit().config.appAuthPolicy,
            authHandler: getNodeKit().config.appAuthHandler,
        };

        routesInstance = {
            'GET /__core/meta': {
                handler: handleMetaInfo,
                ...disabledPolicy,
            },
            'POST /webhook': {
                handler: handleWebhook,
                ...disabledPolicy,
            },
            'POST /api/generate': {
                handler: generate,
                ...disabledPolicy,
            },
            'POST /api/:action': {
                handler: handleApiActions,
                ...disabledPolicy,
            },
            'GET /api/logs': {
                handler: (req, res) => {
                    const {hash} = req.query;
                    res.redirect(`/instance/${hash}/build-logs`);
                },
                ...disabledPolicy,
            },
            'GET /ping': {
                handler: handlePing,
                ...disabledPolicy,
            },
            'GET /error': {
                handler: (req, res) => {
                    const {hash} = req.query;
                    res.redirect(`/instance/${hash}`);
                },
                ...disabledPolicy,
            },
            'GET /create': {
                handler: (_, res) => {
                    res.redirect('/instance/create');
                },
                ...disabledPolicy,
            },
            'GET /log/:hash': {
                handler: (req, res) => {
                    const {hash} = req.params;
                    res.redirect(`/instance/${hash}/run-logs`);
                },
                ...disabledPolicy,
            },
            'GET *': {
                handler: handleMain,
                ...authPolicy,
            },
        };
    }
    return routesInstance;
}
