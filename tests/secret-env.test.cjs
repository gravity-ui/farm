const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const ts = require('typescript');
require('ts-node/register');

const shared = require('../src/shared/secret-env.ts');
const security = require('../src/server/utils/secret-env.ts');
const {MASKED_SECRET_VALUE} = shared;
const secret = 'fictional/private+value"with-spaces';
const variables = {'secret:ENV_TEST_SECRET': secret, ENV_TEST_PUBLIC: 'public fixture'};

function load(relativePath, dependencies) {
    const filename = path.join(__dirname, '..', relativePath);
    const module = {exports: {}};
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    vm.runInNewContext(
        source,
        {
            exports: module.exports,
            module,
            process,
            console,
            Date,
            setInterval,
            clearInterval,
            require(name) {
                if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
                return dependencies[name];
            },
        },
        {filename},
    );
    return module.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test('masks marked values and copies throughout JSON payloads without mutating storage', () => {
    const input = {
        envVariables: {...variables},
        nested: {value: secret},
        log: secret + encodeURIComponent(secret),
    };
    const before = JSON.stringify(input);
    const output = security.maskSecrets(input);
    assert.equal(output.envVariables['secret:ENV_TEST_SECRET'], MASKED_SECRET_VALUE);
    assert.equal(output.envVariables.ENV_TEST_PUBLIC, 'public fixture');
    assert.equal(output.nested.value, MASKED_SECRET_VALUE);
    assert.equal(output.log, MASKED_SECRET_VALUE + MASKED_SECRET_VALUE);
    assert.equal(JSON.stringify(input), before);
    assert.ok(!JSON.stringify(output).includes(secret));
});

test('normalizes provider keys and preserves full values and layer precedence', () => {
    assert.deepEqual(security.mergeSecretEnv(variables), {
        ENV_TEST_SECRET: secret,
        ENV_TEST_PUBLIC: 'public fixture',
    });
    assert.deepEqual(security.mergeSecretEnv(variables, {ENV_TEST_SECRET: 'override fixture'}), {
        ENV_TEST_SECRET: 'override fixture',
        ENV_TEST_PUBLIC: 'public fixture',
    });
    assert.equal(variables['secret:ENV_TEST_SECRET'], secret);
    assert.throws(
        () => security.normalizeSecretEnv({'secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE}),
        /Secret value must be provided/,
    );
});

test('restores only matching marked keys and rejects masks without a stored value', () => {
    assert.deepEqual(
        security.restoreMaskedSecrets({'secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE}, variables),
        {'secret:ENV_TEST_SECRET': secret},
    );
    for (const stored of [
        undefined,
        {ENV_TEST_SECRET: secret},
        {'secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE},
    ]) {
        assert.throws(
            () =>
                security.restoreMaskedSecrets(
                    {'secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE},
                    stored,
                ),
            /Secret value must be provided/,
        );
    }
});

test('public env builders normalize metadata for provider plugins without truncating values', () => {
    const helpers = load('src/server/utils/envHelpers.ts', {'./secret-env': security});
    assert.deepEqual(plain(helpers.buildEnvVariablesStrPairArr(variables, {noWrap: true})), [
        `ENV_TEST_SECRET=${secret}`,
        'ENV_TEST_PUBLIC=public fixture',
    ]);
    const builder = helpers.createEnvBuilder();
    builder.addLowPriority(variables);
    builder.addHighPriority({ENV_TEST_PUBLIC: 'override fixture'});
    assert.deepEqual(plain(builder.result), {
        ENV_TEST_SECRET: secret,
        ENV_TEST_PUBLIC: 'override fixture',
    });
});

function generateHarness(source) {
    let queued;
    let configRequests = 0;
    const {generate} = load('src/server/controllers/generate.ts', {
        zod: {
            z: {
                object: () => ({
                    passthrough() {
                        return this;
                    },
                    safeParseAsync: async (data) => ({success: true, data}),
                }),
                string: () => ({
                    min() {
                        return this;
                    },
                    optional() {
                        return this;
                    },
                }),
                number: () => ({
                    optional() {
                        return this;
                    },
                }),
                record: () => ({
                    optional() {
                        return this;
                    },
                }),
            },
        },
        '../../shared/constants': {
            ENV_PREFIX: 'env.',
            RUN_ENV_PREFIX: 'runEnv.',
            LABEL_PREFIX: 'label.',
        },
        '../../shared/secret-env': shared,
        '../utils/common': {
            filterEmptyObjectEntries: (value) => value,
            generateInstanceHash: () => 'fixturehash',
            wrapInternalError: security.maskSecrets,
        },
        '../utils/db': {getInstance: async () => source},
        '../utils/farmJsonConfig': {
            fetchProjectConfig: async () => {
                configRequests++;
                return {preview: []};
            },
        },
        '../utils/instance': {
            addInstanceToGenerateQueue: async (value) => {
                queued = value;
            },
        },
        '../utils/secret-env': security,
        '../utils/stats': {sendStats() {}},
        '../utils/vcs': {getVcs: () => ({})},
    });
    return {
        async call(body) {
            let result;
            let status = 200;
            await generate(
                {
                    body: {project: 'fixture', branch: 'main', vcs: 'git', ...body},
                    ctx: {logError() {}},
                },
                {
                    status(value) {
                        status = value;
                        return this;
                    },
                    send(value) {
                        result = value;
                    },
                },
            );
            return {status, result, queued, configRequests};
        },
    };
}

test('generate preserves stored secrets for rebuild and clone with an explicit source hash', async () => {
    const harness = generateHarness({
        project: 'fixture',
        envVariables: variables,
        runEnvVariables: {'secret:ENV_TEST_SECRET': 'fictional runtime value'},
    });
    const result = await harness.call({
        secretSourceHash: 'fixture-source',
        'env.secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE,
        'runEnv.secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE,
    });
    assert.equal(result.status, 200);
    assert.equal(result.queued.envVariables['secret:ENV_TEST_SECRET'], secret);
    assert.equal(
        result.queued.runEnvVariables['secret:ENV_TEST_SECRET'],
        'fictional runtime value',
    );
    assert.ok(!JSON.stringify(result.result).includes(secret));
});

test('generate rejects masked roundtrips before config lookup or queueing, including cross-project and cross-scope sources', async () => {
    for (const source of [
        undefined,
        {project: 'different', envVariables: variables},
        {project: 'fixture', runEnvVariables: variables},
    ]) {
        const result = await generateHarness(source).call({
            secretSourceHash: 'fixture-source',
            'env.secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE,
        });
        assert.equal(result.status, 400);
        assert.equal(result.queued, undefined);
        assert.equal(result.configRequests, 0);
        assert.ok(!JSON.stringify(result.result).includes(secret));
    }
    const missing = await generateHarness({project: 'fixture', envVariables: variables}).call({
        'env.secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE,
    });
    assert.equal(missing.status, 400);
});

test('generate accepts new full secret values including whitespace without needing a source', async () => {
    const value = '  fictional secret fixture  ';
    const result = await generateHarness().call({
        'env.secret:ENV_TEST_SECRET': value,
        'env.ENV_TEST_PUBLIC': 'public fixture',
    });
    assert.equal(result.status, 200);
    assert.equal(result.queued.envVariables['secret:ENV_TEST_SECRET'], value);
    assert.equal(result.queued.envVariables.ENV_TEST_PUBLIC, 'public fixture');
});

test('API boundary masks instance, queue, config and error payloads using marked metadata', async () => {
    const response = {
        instance: {envVariables: variables},
        queue: [{runEnvVariables: variables}],
        config: {env: variables},
        error: new Error(secret),
    };
    const controller = load('src/server/controllers/api.ts', {
        '../components/api-actions': {
            fixture: async () => ({ok: false, data: response, message: secret}),
        },
        '../utils/common': {getGlobalFarmConfig: () => ({})},
        '../utils/secret-env': security,
        '../utils/stats': {sendStats() {}},
    }).default;
    let output;
    await controller(
        {params: {action: 'fixture'}, method: 'POST', body: {}, ctx: {}},
        {
            status() {
                return this;
            },
            send(data) {
                output = data;
            },
        },
    );
    assert.ok(!JSON.stringify(output).includes(secret));
    assert.equal(output.data.instance.envVariables['secret:ENV_TEST_SECRET'], MASKED_SECRET_VALUE);
    assert.equal(response.instance.envVariables['secret:ENV_TEST_SECRET'], secret);
});

test('initial HTML masks configured secrets without changing the server configuration', async () => {
    const config = {projects: {fixture: {env: {...variables}}}};
    const {createLayout} = load('src/server/utils/create-layout.ts', {
        '@gravity-ui/app-layout': {
            createLayoutPlugin: () => ({}),
            createRenderFunction: () => (params) => JSON.stringify(params),
        },
        '../components/core-plugin-registry': {
            coreRegistry: {
                authProviders: {getProviderInstance: () => undefined},
                uiConfiguration: {getNavigationHelpMenuConfiguration: () => []},
            },
        },
        '../components/node-kit': {getNodeKit: () => ({config: {}})},
        './common': {getGlobalFarmConfig: () => config},
        './secret-env': security,
    });
    const html = await createLayout('main', {ctx: {config: {}}}, {});
    assert.ok(!html.includes(secret));
    assert.ok(html.includes(MASKED_SECRET_VALUE));
    assert.equal(
        JSON.parse(JSON.parse(html).data.farmConfig).projects.fixture.env['secret:ENV_TEST_SECRET'],
        MASKED_SECRET_VALUE,
    );
    assert.equal(config.projects.fixture.env['secret:ENV_TEST_SECRET'], secret);
});

test('build logs are masked before storage and historical read while stored instance values stay complete', async () => {
    const stored = {
        project: 'fixture',
        env_variables: JSON.stringify(variables),
        hash: 'fixturehash',
    };
    let persisted;
    const knexInstance = (table) => ({
        select() {
            return this;
        },
        where() {
            return this;
        },
        first: async () => stored,
        orderBy: async () => [
            {stdout: secret, stderr: encodeURIComponent(secret), command: secret},
        ],
        insert: async (rows) => {
            assert.equal(table, 'instance_build_logs');
            persisted = rows;
        },
    });
    const db = load('src/server/utils/db/index.ts', {
        lodash: {isEmpty: (value) => !value || Object.keys(value).length === 0},
        '../common': {getCurrentTime: Date.now, getGlobalFarmConfig: () => ({})},
        '../secret-env': security,
        './knex': {knexInstance},
    });
    await db.insertInstanceLogs('fixturehash', [{command: secret, stdout: secret, stderr: secret}]);
    assert.ok(!JSON.stringify(persisted).includes(secret));
    assert.equal(persisted[0].stdout, MASKED_SECRET_VALUE);
    assert.equal(persisted[0].stderr, MASKED_SECRET_VALUE);
    assert.equal(persisted[0].command, MASKED_SECRET_VALUE);
    const historical = await db.listInstanceBuildLogs('fixturehash');
    assert.ok(!JSON.stringify(historical).includes(secret));
    assert.equal(historical[0].stdout, MASKED_SECRET_VALUE);
    assert.equal(historical[0].stderr, MASKED_SECRET_VALUE);
    assert.equal(
        (await db.getInstance('fixturehash')).envVariables['secret:ENV_TEST_SECRET'],
        secret,
    );
    assert.equal(JSON.parse(stored.env_variables)['secret:ENV_TEST_SECRET'], secret);
});

test('start and restart pass complete stored values under ordinary provider names', async () => {
    const received = [];
    const utils = load('src/server/utils/instance/index.ts', {
        '../../components/farm-provider': {
            getFarmProvider: () => ({
                startInstance: async (instance) => received.push(instance),
                restartInstance: async (instance) => received.push(instance),
            }),
        },
        '../common': {},
        '../db': {},
        '../secret-env': security,
        './limiter': {isGenerateAllowedByLimits: async () => true},
    });
    const instance = {
        project: 'fixture',
        hash: 'fixturehash',
        envVariables: variables,
        runEnvVariables: {'secret:ENV_TEST_SECRET': 'fictional runtime fixture'},
    };
    await utils.startInstance(instance);
    await utils.restartInstance(instance);
    for (const value of received) {
        assert.equal(value.envVariables.ENV_TEST_SECRET, secret);
        assert.equal(value.runEnvVariables.ENV_TEST_SECRET, 'fictional runtime fixture');
        assert.ok(!('secret:ENV_TEST_SECRET' in value.envVariables));
    }
    assert.equal(instance.envVariables['secret:ENV_TEST_SECRET'], secret);
});

test('shell logs and failures are masked but functional successful stdout remains complete', async () => {
    security.registerSecrets(variables);
    let code = 0;
    const shell = {
        exec: (_command, _options, callback) => {
            setTimeout(() => callback(code, secret, secret), 0);
            return {pid: 1, stdout: {on() {}}, stderr: {on() {}}};
        },
    };
    const {executeRun} = load('src/server/utils/async.ts', {
        shelljs: shell,
        './secret-env': security,
    });
    const emitted = [];
    const result = await executeRun(`echo ${secret}`, {}, (value) => emitted.push(value));
    assert.equal(result.stdout, secret);
    assert.ok(!JSON.stringify(emitted).includes(secret));
    code = 1;
    await assert.rejects(executeRun(`echo ${secret}`), (error) => {
        assert.ok(!JSON.stringify(error).includes(secret));
        return true;
    });
});

test('fixed mask stays unchanged when another secret overlaps its text', () => {
    security.registerSecrets({'secret:ENV_TEST_SECRET': 'REDACTED'});
    assert.equal(security.redactSecretText(MASKED_SECRET_VALUE), MASKED_SECRET_VALUE);
    assert.equal(security.redactSecretText(secret), MASKED_SECRET_VALUE);
});

test('preserves empty stored secrets, JSON dates and rejects empty secret names before launch', () => {
    assert.deepEqual(
        security.restoreMaskedSecrets(
            {'secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE},
            {'secret:ENV_TEST_SECRET': ''},
        ),
        {'secret:ENV_TEST_SECRET': ''},
    );
    const date = new Date('2026-10-15T00:00:00Z');
    assert.equal(security.maskSecrets({date}).date.toISOString(), date.toISOString());
    assert.throws(
        () => security.normalizeSecretEnv({'secret:': 'fictional value'}),
        /Invalid secret environment key/,
    );
});

test('generate keeps an empty restored secret value instead of dropping its metadata', async () => {
    const result = await generateHarness({
        project: 'fixture',
        envVariables: {'secret:ENV_TEST_SECRET': ''},
    }).call({
        secretSourceHash: 'fixture-source',
        'env.secret:ENV_TEST_SECRET': MASKED_SECRET_VALUE,
    });
    assert.equal(result.status, 200);
    assert.ok(Object.hasOwn(result.queued.envVariables, 'secret:ENV_TEST_SECRET'));
    assert.equal(result.queued.envVariables['secret:ENV_TEST_SECRET'], '');
});

test('secret values matching public statuses and short hash fragments do not corrupt API structure', () => {
    for (const value of ['generated', 'a']) {
        const input = {
            status: 'generated',
            hash: 'aaaa',
            branch: 'a/generated',
            project: 'a',
            url: '/a/generated',
            envVariables: {'secret:ENV_TEST_SECRET': value, ENV_TEST_PUBLIC: value},
        };
        const masked = security.maskSecrets(input);
        for (const key of ['status', 'hash', 'branch', 'project', 'url'])
            assert.equal(masked[key], input[key]);
        assert.equal(masked.envVariables['secret:ENV_TEST_SECRET'], MASKED_SECRET_VALUE);
        assert.equal(masked.envVariables.ENV_TEST_PUBLIC, MASKED_SECRET_VALUE);
    }
});

test('invalid requests and local response masking never poison the process log registry', async () => {
    const value = 'fictional rejected unique fixture';
    const result = await generateHarness().call({'env.secret:': value});
    assert.equal(result.status, 400);
    assert.equal(security.redactSecretText(value), value);
    security.maskSecrets({'secret:ENV_TEST_SECRET': value});
    assert.equal(security.redactSecretText(value), value);
});

test('stream redaction protects secrets split over separate flushes and historical terminal rows', () => {
    security.registerSecrets(variables);
    for (const code of [null, 0]) {
        const chunks = [
            {stdout: secret.slice(0, 12), code},
            {stdout: secret.slice(12), code},
        ];
        const masked = security.maskLogFragments(chunks);
        assert.ok(
            !masked
                .map((row) => row.stdout)
                .join('')
                .includes(secret),
        );
        assert.ok(masked.some((row) => row.stdout.includes(MASKED_SECRET_VALUE)));
    }
    const redactor = security.createSecretLogRedactor();
    const first = redactor.redact([{stdout: secret.slice(0, 12), code: null}]);
    const second = redactor.redact([{stdout: secret.slice(12), code: null}]);
    assert.equal(first[0].stdout, '');
    assert.equal(second[0].stdout, MASKED_SECRET_VALUE);
});

test('private persisted config snapshots hydrate log masking without changing instance env or requiring VCS', async () => {
    const value = 'fictional repo snapshot fixture';
    const userEnv = {ENV_TEST_PUBLIC: 'public fixture'};
    const row = {
        project: 'fixture',
        status: 'generated',
        env_variables: JSON.stringify(userEnv),
        hash: 'fixturehash',
    };
    const knexInstance = (table) => ({
        select() {
            return this;
        },
        where() {
            return this;
        },
        first: async () => row,
        update: async (data) => Object.assign(row, data),
        orderBy: async () => [{stdout: value, code: 0}],
    });
    const db = load('src/server/utils/db/index.ts', {
        lodash: {isEmpty: (value) => !value || Object.keys(value).length === 0},
        '../common': {getCurrentTime: Date.now, getGlobalFarmConfig: () => ({})},
        '../secret-env': security,
        './knex': {knexInstance},
    });
    await db.updateInstanceSecretSnapshot('fixturehash', {env: {'secret:ENV_TEST_SECRET': value}});
    assert.deepEqual(plain((await db.getInstance('fixturehash')).envVariables), userEnv);
    assert.deepEqual(JSON.parse(row.env_variables).secretSnapshot, [value]);
    const read = load('src/server/components/api-actions/listLogs.ts', {
        lodash: {isEmpty: (value) => !value || value.length === 0},
        '../../utils/common': {wrapInternalError: security.maskSecrets},
        '../../utils/db': db,
    }).default;
    const result = await read({data: {hash: 'fixturehash'}, ctx: {}});
    assert.equal(result.ok, true);
    assert.equal(result.data.logs[0].stdout, MASKED_SECRET_VALUE);
    assert.ok(!Object.hasOwn(await db.getInstance('fixturehash'), 'secretSnapshot'));
});

test('valid JSON secrets containing lone surrogates cannot break logging or stream masking', () => {
    const value = '\ud800';
    security.registerSecrets({'secret:ENV_TEST_SECRET': value});
    assert.equal(security.maskSecrets({message: 'ordinary log'}).message, 'ordinary log');
    assert.equal(security.redactSecretText(value), MASKED_SECRET_VALUE);
    const stream = security.createSecretTextStream();
    assert.equal(stream.write(value), MASKED_SECRET_VALUE);
});

test('provider primitive log arguments and API descriptions and labels redact known copies', () => {
    security.registerSecrets(variables);
    const emitted = [];
    const {getFarmInternalAPI} = load(
        'src/server/components/farm-provider/internal-api-for-providers.ts',
        {
            '../../utils/db': {},
            '../../utils/secret-env': security,
            '../node-kit': {
                getNodeKit: () => ({
                    ctx: {
                        log: (...args) => emitted.push(args),
                        logError: (...args) => emitted.push(args),
                    },
                }),
            },
        },
    );
    const api = getFarmInternalAPI();
    api.log(secret);
    api.logError(secret, new Error(secret));
    assert.equal(emitted[0][0], MASKED_SECRET_VALUE);
    assert.equal(emitted[1][0], MASKED_SECRET_VALUE);
    assert.equal(emitted[1][1].message, MASKED_SECRET_VALUE);
    const masked = security.maskSecrets({
        description: secret,
        labels: {fixture: secret},
        'env.secret:ENV_TEST_SECRET': secret,
    });
    assert.equal(masked.description, MASKED_SECRET_VALUE);
    assert.equal(masked.labels.fixture, MASKED_SECRET_VALUE);
    assert.equal(masked['env.secret:ENV_TEST_SECRET'], MASKED_SECRET_VALUE);
});
