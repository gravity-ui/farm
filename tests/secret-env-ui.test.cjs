const assert = require('node:assert/strict');
const {test} = require('node:test');

require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require('ts-node').register({
    transpileOnly: true,
    skipProject: true,
    ignoreDiagnostics: [5107],
    compilerOptions: {
        module: 'CommonJS',
        jsx: 'react',
        esModuleInterop: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
        target: 'es2022',
    },
});

const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {Form} = require('react-final-form');
const arrayMutators = require('final-form-arrays').default;
const {ThemeProvider} = require('@gravity-ui/uikit');

global.window = {FM: {lang: 'en'}};
const {
    VariableFields,
} = require('../src/ui/components/Fields/VariablesFieldRow/VariablesFieldRow.tsx');

function renderVariables(name, variables) {
    return renderToStaticMarkup(
        React.createElement(
            ThemeProvider,
            null,
            React.createElement(Form, {
                onSubmit: () => {},
                mutators: arrayMutators,
                initialValues: {[name]: variables},
                render: () =>
                    React.createElement(VariableFields, {
                        name: `${name}[0]`,
                        secretEnabled: name !== 'labels',
                    }),
            }),
        ),
    );
}

test('secret build and runtime rows use password controls and a lock marker', () => {
    for (const name of ['variables', 'runVariables']) {
        const html = renderVariables(name, [
            {key: 'secret:ENV_TEST_SECRET', value: 'dummy-secret'},
        ]);
        assert.match(html, /type="password"/);
        assert.match(html, /aria-label="Secret environment variable"/);
        assert.ok(!html.includes('type="button" aria-label="Show'));
    }
});

test('stored secret markers do not populate editable password values', () => {
    const html = renderVariables('variables', [
        {key: 'secret:ENV_TEST_SECRET', value: '[REDACTED]'},
    ]);
    assert.match(html, /Stored secret, enter a new value to replace/);
    assert.ok(!html.includes('value="[REDACTED]"'));
    assert.match(html, /type="password"/);
});

test('public variables and labels retain plain text controls', () => {
    for (const [name, key] of [
        ['variables', 'ENV_TEST_PUBLIC'],
        ['labels', 'secret:ENV_TEST_PUBLIC'],
    ]) {
        const html = renderVariables(name, [{key, value: 'dummy-public'}]);
        assert.ok(!html.includes('type="password"'));
        assert.ok(!html.includes('aria-label="Secret environment variable"'));
        assert.match(html, /value="dummy-public"/);
    }
});

test('create request and URL values preserve secret whitespace for build and runtime variables', () => {
    const {
        prepareEnvFormVariables,
        normalizeEnvValue,
    } = require('../src/ui/utils/prepareEnvFormVariables.ts');
    for (const prefix of ['ENV_', 'RUN_ENV_']) {
        const request = prepareEnvFormVariables(
            [
                {key: ' secret:ENV_TEST_SECRET ', value: '  dummy-secret \n'},
                {key: 'ENV_TEST_PUBLIC', value: '  dummy-public  '},
            ],
            prefix,
        );
        assert.equal(request[`${prefix}secret:ENV_TEST_SECRET`], '  dummy-secret \n');
        assert.equal(request[`${prefix}ENV_TEST_PUBLIC`], 'dummy-public');
    }
    assert.equal(
        normalizeEnvValue('secret:ENV_TEST_SECRET', '  dummy-secret  '),
        '  dummy-secret  ',
    );
    assert.equal(normalizeEnvValue('ENV_TEST_PUBLIC', '  dummy-public  '), 'dummy-public');
});
