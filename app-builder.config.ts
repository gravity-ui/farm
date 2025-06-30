import path from 'path';

import {defineConfig, type ServiceConfig} from '@gravity-ui/app-builder';

/**
 * export Base Config to use in extensions
 */
export const farmAppBuilderConfig: ServiceConfig = {
    client: {
        devServer: {
            port: process.env.UI_PORT ? parseInt(process.env.UI_PORT, 10) : undefined,
        },
        reactRefresh: (options) => ({
            ...options,
            overlay: false,
        }),
        bundler: 'rspack',
        javaScriptLoader: 'swc',
        includes: ['src/shared'],
        alias: {
            [path.resolve(__dirname, 'src/ui/components/ReactQueryDevtools/ReactQueryDevtools')]:
                process.env.NODE_ENV === 'production'
                    ? path.resolve(
                          __dirname,
                          'src/ui/components/ReactQueryDevtools/ReactQueryDevtools.prod.ts',
                      )
                    : path.resolve(
                          __dirname,
                          'src/ui/components/ReactQueryDevtools/ReactQueryDevtools.tsx',
                      ),
        },
        fallback: {
            path: require.resolve('path-browserify'),
            url: false,
            fs: false,
            process: false,
        },
    },
};

export default defineConfig(farmAppBuilderConfig);
