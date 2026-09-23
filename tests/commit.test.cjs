const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, test} = require('node:test');

const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-commit-test-'));
const configPath = path.join(configDir, 'farm-config.cjs');
fs.writeFileSync(
    configPath,
    "module.exports = {projects: {sample: {repositoryPath: 'owner/sample', vcs: 'git', vcsCredentials: {git: {authTokenEnvName: 'FARM_TEST_NO_TOKEN'}}}}};",
);
process.env.FARM_ENV_PATH = configPath;
after(() => fs.rmSync(configDir, {recursive: true, force: true}));

require('ts-node/register');

const {generateInstanceHash} = require('../src/server/utils/common.ts');
const {GitVcs} = require('../src/server/utils/vcs/git.ts');
const {getCheckoutRef} = require('../src/server/utils/vcs/vcs.ts');
const {isCommitHash} = require('../src/shared/commit.ts');
const commitMigration = require('../src/server/utils/db/migrations/20260923000000_add_commit.ts');

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
    assert.equal(
        generateInstanceHash({...identity, commit: firstCommit}),
        generateInstanceHash({...identity, commit: secondCommit}),
    );
    assert.throws(() => getCheckoutRef({branch: identity.branch, commit: 'other-ref'}));
});

test('Git checkout commands select the supplied commit', () => {
    const commands = new GitVcs().getK8sCheckoutCommands({
        project: 'sample',
        branch: 'feature',
        commit: firstCommit,
    });

    assert.ok(commands.includes(`git fetch --depth 1 origin ${firstCommit}`));
    assert.ok(commands.includes(`git checkout --detach ${firstCommit}`));
    assert.ok(commands.includes("mkdir -p 'owner/sample'"));
    assert.ok(!commands.some((command) => command.includes('-b feature')));
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
