import baseConfig from '@gravity-ui/eslint-config';
import clientConfig from '@gravity-ui/eslint-config/client';
import prettierConfig from '@gravity-ui/eslint-config/prettier';
import serverConfig from '@gravity-ui/eslint-config/server';
import * as tsParser from '@typescript-eslint/parser';
import {defineConfig} from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import localRulesPlugin from 'eslint-plugin-local-rules';
import lodashPlugin from 'eslint-plugin-lodash';
import globals from 'globals';

export const getDefineConfig = ({uiFiles, serverFiles, ignores}) =>
    defineConfig([
        ...baseConfig,
        ...prettierConfig,
        {
            languageOptions: {
                globals: {
                    ...globals.node,
                },
            },
            plugins: {
                import: importPlugin,
                lodash: lodashPlugin,
                'local-rules': localRulesPlugin,
            },
            rules: {
                // Gravity rules
                'no-param-reassign': [
                    'warn',
                    {props: true, ignorePropertyModificationsFor: ['acc']},
                ],
                'no-confusing-arrow': 'off',
                'no-shadow': 'off',

                // Lodash rules
                'lodash/chaining': ['error', 'never'],
                'lodash/callback-binding': 'error',
                'lodash/collection-method-value': 'error',
                'lodash/collection-return': 'error',
                'lodash/no-double-unwrap': 'error',
                'lodash/no-extra-args': 'error',
                'lodash/no-unbound-this': 'error',

                // Restriction rules
                'no-restricted-imports': [
                    'error',
                    {
                        paths: [
                            {
                                name: 'knex',
                                message: 'Please use knex only in the `utils/db`',
                            },
                            {
                                name: '@gravity-ui/i18n',
                                message: 'Please use i18n only from the `services/i18n` instance.',
                            },
                            {
                                name: '@gravity-ui/data-source',
                                importNames: [
                                    'makePlainQueryDataSource',
                                    'makeInfiniteQueryDataSource',
                                    'DataLoader',
                                    'DataInfiniteLoader',
                                ],
                                message: 'Import these entities from components/data-source',
                            },
                        ],
                    },
                ],

                // Import rules
                'import/no-named-as-default': 'off',
                'import/first': 'error',
                'import/newline-after-import': 'error',
                'import/order': [
                    'error',
                    {
                        alphabetize: {
                            order: 'asc',
                        },
                        'newlines-between': 'always',
                        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                        pathGroups: [
                            {
                                pattern: 'react',
                                group: 'external',
                                position: 'before',
                            },
                            {
                                pattern: '{@gravity-ui}/**',
                                group: 'external',
                                position: 'after',
                            },
                            {
                                pattern: 'shared/**',
                                group: 'internal',
                                position: 'before',
                            },
                            {
                                pattern: '*.{svg,png,jpg,jpeg,json}',
                                patternOptions: {
                                    dot: true,
                                    nocomment: true,
                                    matchBase: true,
                                },
                                group: 'type',
                                position: 'after',
                            },
                            {
                                pattern: 'server/**',
                                group: 'internal',
                                position: 'before',
                            },
                            {
                                pattern: 'ui/**',
                                group: 'internal',
                                position: 'before',
                            },
                            {
                                pattern: '*.{css,scss}',
                                patternOptions: {
                                    dot: true,
                                    nocomment: true,
                                    matchBase: true,
                                },
                                group: 'type',
                                position: 'after',
                            },
                        ],
                        pathGroupsExcludedImportTypes: [
                            '*.{css,scss}',
                            '*.{svg,png,jpg,jpeg,json}',
                            'react',
                        ],
                        warnOnUnassignedImports: true,
                    },
                ],
                'import/no-extraneous-dependencies': [
                    'warn',
                    {
                        includeTypes: true,
                    },
                ],
            },
        },
        {
            files: ['**/*.{ts,tsx}'],
            languageOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
                globals: globals.browser,
                parserOptions: {
                    project: ['./tsconfig.json'],
                    tsconfigRootDir: import.meta.dirname,
                    projectFolderIgnoreList: ['dist/'],
                    projectService: {
                        allowDefaultProject: ['commitlint.config.mjs', 'eslint.config.mjs'],
                    },
                },
            },
            rules: {
                '@typescript-eslint/consistent-type-imports': 'error',
                '@typescript-eslint/parameter-properties': 'warn',
                '@typescript-eslint/no-floating-promises': 'warn',
                '@typescript-eslint/require-await': 'warn',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                        args: 'all',
                        argsIgnorePattern: '^_',
                        caughtErrors: 'all',
                        caughtErrorsIgnorePattern: '^_',
                        destructuredArrayIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                        ignoreRestSiblings: true,
                    },
                ],
            },
            settings: {
                'import/parsers': {
                    '@typescript-eslint/parser': ['.ts', '.tsx'],
                },
                'import/resolver': {
                    typescript: {
                        // for some reason only glob pattern tsconfig works in vscode
                        project: 'src/*/tsconfig.json',
                    },
                },
            },
        },
        {
            files: uiFiles,
            extends: [clientConfig],
            languageOptions: {
                globals: {
                    FM: false,
                },
            },
            rules: {
                // These local rules should be "error"
                'local-rules/no-restricted-i18n-import': 'error',
                'react/jsx-fragments': ['error', 'element'],
                'react/display-name': 'warn',
                'react/no-deprecated': ['warn'],
                'react-hooks/exhaustive-deps': 'error',
            },
        },
        {
            files: serverFiles,
            extends: [serverConfig],
            rules: {
                '@typescript-eslint/explicit-member-accessibility': 0,
                'no-console': 'warn',
                '@typescript-eslint/member-ordering': 0,
                complexity: 0,
                'local-rules/no-core-public-api-import': 'error',
            },
        },
        {
            ignores,
        },
    ]);

export default getDefineConfig({
    uiFiles: ['src/ui/**'],
    serverFiles: ['src/server/**'],
    ignores: ['app-builder.config.ts', 'dist'],
});
