const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, test} = require('node:test');

const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-commit-test-'));
const configPath = path.join(configDir, 'farm-config.cjs');
fs.writeFileSync(
    configPath,
    "module.exports = {farmProvider: {name: 'test'}, projects: {sample: {repositoryPath: 'owner/sample', vcs: 'git', vcsCredentials: {git: {authTokenEnvName: 'FARM_TEST_NO_TOKEN'}}}}};",
);
process.env.FARM_ENV_PATH = configPath;
process.env.FARM_DB_FILE_PATH = path.join(configDir, 'farm.db');

require('ts-node/register');

const {coreRegistry} = require('../src/server/components/core-plugin-registry/index.ts');
const {generate} = require('../src/server/controllers/generate.ts');
const {generateInstanceHash} = require('../src/server/utils/common.ts');
const {knexInstance} = require('../src/server/utils/db/knex.ts');
const commitMigration = require('../src/server/utils/db/migrations/20260923000000_add_commit.ts');
const {fetchProjectConfig} = require('../src/server/utils/farmJsonConfig.ts');
const {GitVcs} = require('../src/server/utils/vcs/git.ts');
const {getCheckoutRef} = require('../src/server/utils/vcs/vcs.ts');
const {isCommitHash} = require('../src/shared/commit.ts');

after(async () => {
    await knexInstance.destroy();
    fs.rmSync(configDir, {recursive: true, force: true});
});

const firstCommit = 'da39c776388d1e17f9d70eeb098d5f56a90630b2';
const secondCommit = '08799c8d388d1e17f9d70eeb098d5f56a90630b2';

test('commit changes checkout ref but not instance hash', () => {
    const identity = {
        project: 'sample',
        branch: 'feature',
        vcs: 'git',
        instanceConfigName: '',
        additionalEnvVariables: {},
        additionalRunEnvVariables: {},
    };

    assert.equal(getCheckoutRef({branch: identity.branch}), identity.branch);
    assert.equal(getCheckoutRef({branch: identity.branch, commit: firstCommit}), firstCommit);
    assert.equal(isCommitHash(firstCommit), true);
    assert.equal(isCommitHash(firstCommit.slice(0, -1)), false);
    assert.equal(getCheckoutRef({branch: identity.branch, commit: 'revision:42'}), 'revision:42');
    assert.equal(
        generateInstanceHash({...identity, commit: firstCommit}),
        generateInstanceHash({...identity, commit: secondCommit}),
    );
});

test('Git checkout commands select the supplied commit', () => {
    const vcs = new GitVcs();
    const commands = vcs.getK8sCheckoutCommands({
        project: 'sample',
        branch: 'feature',
        commit: firstCommit,
    });

    assert.ok(commands.includes(`git fetch --depth 1 origin ${firstCommit}`));
    assert.ok(commands.includes(`git checkout --detach ${firstCommit}`));
    assert.ok(commands.includes("mkdir -p 'owner/sample'"));
    assert.ok(!commands.some((command) => command.includes('-b feature')));
    assert.throws(() => vcs.getCheckoutRef({branch: 'feature', commit: 'revision:42'}));
    assert.throws(() => vcs.getCheckoutRef({branch: 'feature', commit: ''}));
    assert.throws(() =>
        vcs.getK8sCheckoutCommands({project: 'sample', branch: 'feature', commit: 'revision:42'}),
    );
});

test('custom VCS accepts its revision through generation and config lookup', async () => {
    const refs = [];
    const vcs = {
        getCheckoutRef: getCheckoutRef,
        isValidRef: (ref) => /^revision:\d+$/.test(ref),
        getProjectConfig: async ({commit}) => {
            refs.push(commit);
            return {'preview-generator': {instances: [{name: ''}]}};
        },
    };

    coreRegistry.vcs.setInstance('custom', vcs);
    coreRegistry.farmProviders.setInstance('test', {stopBuilder: async () => undefined});
    coreRegistry.farmJsonConfig.defineFields(['name']);
    await knexInstance.migrate.latest();

    const firstConfig = await fetchProjectConfig({
        vcs: 'custom',
        project: 'sample',
        branch: 'feature',
        commit: 'revision:42',
    });
    const secondConfig = await fetchProjectConfig({
        vcs: 'custom',
        project: 'sample',
        branch: 'feature',
        commit: 'revision:43',
    });
    assert.equal(firstConfig.preview[0].name, '');
    assert.equal(secondConfig.preview[0].name, '');
    assert.deepEqual(refs, ['revision:42', 'revision:43']);

    coreRegistry.vcs.setInstance('legacy', {
        getProjectConfig: async ({commit}) => {
            assert.equal(commit, 'release@42');
            return {'preview-generator': {instances: [{name: ''}]}};
        },
    });
    const legacyConfig = await fetchProjectConfig({
        vcs: 'legacy',
        project: 'sample',
        branch: 'feature',
        commit: 'release@42',
    });
    assert.equal(legacyConfig.preview[0].name, '');

    const generated = [];
    const req = {
        body: {project: 'sample', branch: 'feature', vcs: 'custom', commit: 'revision:42'},
        ctx: {logError: () => undefined, stats: () => undefined},
        id: 'custom-vcs-test',
        url: '/api/generate',
    };
    const res = {
        send: (body) => generated.push(body),
        status: (status) => ({send: (body) => generated.push({status, ...body})}),
        sendStatus: (status) => generated.push({status}),
    };
    await generate(req, res);
    assert.equal(generated.length, 1);
    assert.equal(
        (await knexInstance('instances').where({hash: generated[0].hash}).first()).commit,
        'revision:42',
    );

    req.body.commit = 'revision:43';
    await generate(req, res);
    assert.equal(generated[1].hash, generated[0].hash);
    assert.equal(
        (await knexInstance('instances').where({hash: generated[0].hash}).first()).commit,
        'revision:43',
    );

    req.body.commit = 'invalid';
    await generate(req, res);
    assert.deepEqual(generated[2], {
        status: 400,
        message: 'Invalid request parameters: commit',
        fields: ['commit'],
    });
});

test('Git rejects invalid commit with 400 before config lookup', async () => {
    coreRegistry.vcs.setInstance('git', new GitVcs());
    const responses = [];
    for (const commit of ['revision:42', '']) {
        await generate(
            {
                body: {project: 'sample', branch: 'feature', vcs: 'git', commit},
                ctx: {logError: () => undefined},
            },
            {
                status: (status) => ({send: (body) => responses.push({status, ...body})}),
                sendStatus: (status) => responses.push({status}),
            },
        );
    }
    assert.deepEqual(responses, [
        {status: 400, message: 'Invalid request parameters: commit', fields: ['commit']},
        {status: 400, message: 'Invalid request parameters: commit', fields: ['commit']},
    ]);
});

test('generation reports every invalid request field', async () => {
    const responses = [];
    await generate(
        {
            body: {branch: 'feature', vcs: 'git', stopTimeout: 'later'},
            ctx: {logError: () => undefined},
        },
        {
            status: (status) => ({send: (body) => responses.push({status, ...body})}),
        },
    );

    assert.deepEqual(responses, [
        {
            status: 400,
            message: 'Invalid request parameters: project, stopTimeout',
            fields: ['project', 'stopTimeout'],
        },
    ]);
});

test('Git pull request webhook records its head commit', () => {
    const data = new GitVcs().parsePullRequestData({
        action: 'opened',
        pull_request: {
            title: 'A change',
            body: '',
            head: {ref: 'feature', sha: firstCommit},
            base: {ref: 'main'},
        },
        repository: {full_name: 'owner/sample'},
    });

    assert.equal(data.branch, 'feature');
    assert.equal(data.commit, firstCommit);
});

test('commit migration keeps existing instances and stores new commits', async () => {
    const db = require('knex')({
        client: 'sqlite3',
        connection: {filename: ':memory:'},
        useNullAsDefault: true,
    });

    try {
        await db.schema.createTable('instances', (table) => {
            table.text('hash').primary();
        });
        await db('instances').insert({hash: 'existing'});

        await commitMigration.up(db);
        await db('instances').insert({hash: 'new', commit: firstCommit});

        const rows = await db('instances').orderBy('hash');
        assert.deepEqual(
            rows.map(({hash, commit}) => ({hash, commit})),
            [
                {hash: 'existing', commit: null},
                {hash: 'new', commit: firstCommit},
            ],
        );
    } finally {
        await db.destroy();
    }
});
