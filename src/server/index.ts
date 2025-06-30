import {AppError} from '@gravity-ui/nodekit';

import {getServerApp} from './app';
import {coreRegistry} from './components/core-plugin-registry';
import {getFarmProvider} from './components/farm-provider';
import {DockerFarmProvider} from './components/farm-provider/docker/docker-farm-provider';
import type {FarmDockerProviderConfig} from './components/farm-provider/docker/types';
import {K8sFarmProvider} from './components/farm-provider/k8s/k8s-farm-provider';
import type {FarmK8sProviderConfig} from './components/farm-provider/k8s/types';
import {getNodeKit} from './components/node-kit';
import type {FarmServerConfigType} from './configs/common';
import {start as startCleanupWorker} from './utils/butler';
import {sleep, wrapInternalError} from './utils/common';
import {knexInstance} from './utils/db/knex';
import {start as startQueueWorker} from './utils/queue';
import {GitVcs} from './utils/vcs/git';

const init = async () => {
    try {
        await knexInstance.migrate.latest().then(() => knexInstance.seed.run());

        coreRegistry.farmJsonConfig.defineFields([
            'name',
            'urlTemplate',
            {field: 'env', mergeWithGlobal: true},
            {field: 'runEnv', mergeWithGlobal: true},
            'start',
            {field: 'envInheritance', mergeWithGlobal: true},
            'dockerfilePath',
            'dockerfileContextPath',
            'dockerInstanceHealthcheck',
            'builderImage',
            'builderEnvSecretName',
            'instanceEnvSecretName',
            'instancePort',
            'instanceProbe',
            'startBuilderTimeout',
            'startInstanceTimeout',
            'buildTimeout',
            'smokeTestsBuildId',
            'e2eTestsBuildId',
        ]);

        coreRegistry.farmProviders.plugIn('docker', {
            constructor({internalApi, config}) {
                if (!config) {
                    throw new Error('Docker farm provider config is required');
                }
                return new DockerFarmProvider(internalApi, config as FarmDockerProviderConfig);
            },
        });

        coreRegistry.farmProviders.plugIn('k8s', {
            constructor({internalApi, config}) {
                return new K8sFarmProvider(internalApi, config as FarmK8sProviderConfig);
            },
        });

        coreRegistry.vcs.plugIn('git', {
            constructor() {
                return new GitVcs();
            },
        });

        await getFarmProvider()
            .startup()
            .then(() => {
                getNodeKit().ctx.log('FarmProvider startup done');
            });

        const config = getNodeKit().config as FarmServerConfigType;

        if (config.authProvider) {
            const authProvider = coreRegistry.authProviders.getProviderInstance(
                config.authProvider ?? '',
            );
            if (authProvider) {
                getNodeKit().config.appAuthHandler = authProvider.authMiddleware;
            }
        }

        coreRegistry.uiConfiguration.setNavigationHelpMenuConfiguration([
            ...coreRegistry.uiConfiguration.getNavigationHelpMenuConfiguration(),
            {
                text: '',
                i18nTextKey: 'documentation',
                url: 'https://github.com/gravity-ui/farm',
            },
            {
                text: '',
                i18nTextKey: 'changelog',
                url: 'https://github.com/gravity-ui/farm',
            },
            {
                text: 'Farm Source Code',
                url: 'https://github.com/gravity-ui/farm',
            },
        ]);
    } catch (error) {
        console.error('INIT ERROR:', error);
        process.exit(1);
    }

    getServerApp().run();

    // infinity jobs for cleanup old instances and queue.
    startCleanupWorker();
    startQueueWorker();
};

const coreExtensionState = {
    isAttached: false,
    markAsReady: () => {},
    isReady: false,
};
export async function initCoreExtension(fn: () => Promise<void>) {
    coreExtensionState.isAttached = true;
    await fn();
    coreExtensionState.markAsReady();
}

const coreExtensionReadinessPromise = new Promise<void>((resolve) => {
    coreExtensionState.markAsReady = resolve;
});

// wait attaching from core extension when available
Promise.race([
    coreExtensionReadinessPromise.then(() => {
        coreExtensionState.isReady = true;
        return 'ready' as const;
    }),
    sleep(1000).then(() => 'timeout' as const),
])
    .then(async (reason) => {
        if (reason === 'timeout' && coreExtensionState.isAttached && !coreExtensionState.isReady) {
            getNodeKit().ctx.log('core extension is attached, but is not ready yet');
            await coreExtensionReadinessPromise;
        }
        if (coreExtensionState.isReady && coreExtensionState.isAttached) {
            getNodeKit().ctx.log('core extension is attached and ready');
        }
        return init();
    })
    .catch((e) => {
        getNodeKit().ctx.logError('APP INIT ERROR:', wrapInternalError(e));
    });

process
    .on('unhandledRejection', (reason) => {
        getNodeKit().ctx.logError(
            'Unhandled Rejection at Promise',
            new AppError('Unhandled Rejection at Promise'),
            {
                reason: wrapInternalError(reason).stack,
                reasonString: String(reason),
            },
        );
    })
    .on('uncaughtException', (err) => {
        getNodeKit().ctx.logError('Uncaught Exception thrown', wrapInternalError(err));
    });
