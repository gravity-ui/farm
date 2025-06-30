import type {RenderParams} from '@gravity-ui/app-layout';
import {createLayoutPlugin, createRenderFunction} from '@gravity-ui/app-layout';
import type {Request, Response} from '@gravity-ui/expresskit';

import type {User} from '../../shared/common';
import {coreRegistry} from '../components/core-plugin-registry';
import {getNodeKit} from '../components/node-kit';
import type {FarmServerConfigType} from '../configs/common';

import {getGlobalFarmConfig} from './common';

const farmConfig = getGlobalFarmConfig();
const envConfigJson = JSON.stringify(farmConfig);

const renderLayout = createRenderFunction([
    createLayoutPlugin({
        manifest: 'dist/public/build/assets-manifest.json',
        publicPath: '/build/',
    }),
]);

const unauthorizedUser: User = {
    login: '',
    avatarUrl: '/defaultUserAvatar.webp',
    displayName: 'Unauthorized',
    lang: '',
    uid: '',
};

export async function createLayout(name: string, req: Request, res: Response) {
    const theme = req.cookies?.farm_theme || 'light';
    const lang = req.cookies?.farm_lang || 'ru';

    const serverConfig = getNodeKit().config as FarmServerConfigType;
    const authProvider = coreRegistry.authProviders.getProviderInstance(
        serverConfig.authProvider ?? '',
    );

    const layoutConfig: RenderParams<FarmGlobalAppData> = {
        data: {
            user: (await authProvider?.getUserInfo?.(req, res)) ?? unauthorizedUser,
            theme,
            lang,
            vcs: farmConfig.vcs ?? '',
            env: process.env.NODE_ENV ?? 'development',
            defaultProject: String(farmConfig.defaultProject),
            defaultBranch: String(farmConfig.defaultBranch),
            farmConfig: envConfigJson,
            version: String(req.ctx.config.appVersion),
            noAuth: Boolean(process.env.NO_AUTH),
            navigationHelpMenuConfiguration:
                coreRegistry.uiConfiguration.getNavigationHelpMenuConfiguration(),
        },
        lang,
        title: 'Farm',
        nonce: req.nonce,
        inlineScripts: ['window.FM = window.__DATA__;'],
        bodyContent: {
            root: '',
            className: `g-root g-root_theme_${theme}`,
        },
        pluginsOptions: {
            layout: {name},
        },
    };

    const html = renderLayout(layoutConfig);

    return html;
}
