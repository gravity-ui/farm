const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, before, beforeEach, test} = require('node:test');

const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-webhook-test-'));
const configPath = path.join(configDir, 'farm-config.cjs');
fs.writeFileSync(
    configPath,
    "module.exports = {farmProvider: {name: 'test'}, urlTemplate: 'https://{hash}.farm.test', projects: {console: {repositoryPath: 'owner/console', vcs: 'custom'}, other: {repositoryPath: 'owner/other', vcs: 'custom'}}};",
);
process.env.FARM_ENV_PATH = configPath;
process.env.FARM_DB_FILE_PATH = path.join(configDir, 'farm.db');

require('ts-node/register');

const {coreRegistry} = require('../src/server/components/core-plugin-registry/index.ts');
const {
    handleUnifiedPullRequest,
} = require('../src/server/controllers/webhook/unified-pull-request.ts');
const {generateInstanceHash} = require('../src/server/utils/common.ts');
const {insertInstance} = require('../src/server/utils/db/index.ts');
const {knexInstance} = require('../src/server/utils/db/knex.ts');

const ctx = {log: () => undefined, logError: () => undefined, stats: () => undefined};
let previewConfigs;

const insert = (
    hash,
    {project = 'console', branch = 'trunk', instanceConfigName = '', labels} = {},
) =>
    insertInstance({
        hash,
        project,
        branch,
        vcs: 'custom',
        instanceConfigName,
        labels,
        status: 'generated',
    });

const getStatuses = async () => {
    const rows = await knexInstance('instances').select('hash', 'status').orderBy('hash');
    return Object.fromEntries(rows.map(({hash, status}) => [hash, status]));
};

const closed = (data) =>
    handleUnifiedPullRequest(
        {action: 'closed', title: '', description: '', ...data},
        'custom',
        ctx,
    );

before(async () => {
    const vcs = {
        getCheckoutRef: ({branch, commit}) => commit || branch,
        getProjectConfig: async () => ({'preview-generator': {instances: previewConfigs}}),
    };
    coreRegistry.vcs.plugIn('custom', {constructor: () => vcs});
    coreRegistry.vcs.setInstance('custom', vcs);
    coreRegistry.farmProviders.setInstance('test', {stopBuilder: async () => undefined});
    coreRegistry.farmJsonConfig.defineFields(['name']);
    await knexInstance.migrate.latest();
});

beforeEach(async () => {
    previewConfigs = [{name: ''}];
    await knexInstance('instances').del();
});

after(async () => {
    await knexInstance.destroy();
    fs.rmSync(configDir, {recursive: true, force: true});
});

test('closed pull request deletes only instances of its project', async () => {
    await insert('mine', {labels: {owner: 'data-transfer'}});
    await insert('foreign', {project: 'other'});
    await insert('feature', {branch: 'users/someone/feature'});

    await closed({project: 'console', branch: 'trunk'});

    assert.deepEqual(await getStatuses(), {
        feature: 'generated',
        foreign: 'generated',
        mine: 'deleting',
    });
});

test('closed pull request with uniqByLabels deletes only matching instances', async () => {
    await insert('mine', {labels: {owner: 'data-transfer'}});
    await insert('configs-pr', {
        labels: {source: 'configs', branch: 'users/someone/pr', instance: 'ru-preprod'},
    });
    await insert('configs-other-pr', {
        labels: {source: 'configs', branch: 'users/someone/other-pr', instance: 'ru-preprod'},
    });

    await closed({
        project: 'console',
        branch: 'trunk',
        labels: {source: 'configs', branch: 'users/someone/pr', instance: 'ru-preprod'},
        uniqByLabels: ['source', 'branch', 'instance'],
    });

    assert.deepEqual(await getStatuses(), {
        'configs-other-pr': 'generated',
        'configs-pr': 'deleting',
        mine: 'generated',
    });
});

test('opened pull request replaces same-label instances only in its project', async () => {
    const labels = {branch: 'users/someone/pr'};
    await insert('foreign-same-labels', {project: 'other', labels});
    await insert('previous-iteration', {branch: 'previous-commit', labels});

    await handleUnifiedPullRequest(
        {
            action: 'opened',
            project: 'console',
            branch: 'next-commit',
            title: '',
            description: '',
            labels,
            uniqByLabels: ['branch'],
        },
        'custom',
        ctx,
    );

    const statuses = await getStatuses();
    assert.equal(statuses['foreign-same-labels'], 'generated');
    assert.equal(statuses['previous-iteration'], 'deleting');
});

test('repeated opened pull request keeps every regenerated configuration', async () => {
    previewConfigs = [{name: 'cfg-a'}, {name: 'cfg-b'}];
    const labels = {branch: 'users/someone/pr'};
    const hashOf = (instanceConfigName) =>
        generateInstanceHash({
            project: 'console',
            vcs: 'custom',
            branch: 'users/someone/pr',
            instanceConfigName,
            additionalEnvVariables: undefined,
            additionalRunEnvVariables: undefined,
        });
    await insert(hashOf('cfg-a'), {
        branch: 'users/someone/pr',
        instanceConfigName: 'cfg-a',
        labels,
    });
    await insert(hashOf('cfg-b'), {
        branch: 'users/someone/pr',
        instanceConfigName: 'cfg-b',
        labels,
    });
    await insert('previous-branch', {branch: 'users/someone/old', labels});

    await handleUnifiedPullRequest(
        {
            action: 'opened',
            project: 'console',
            branch: 'users/someone/pr',
            title: '',
            description: '',
            labels,
            uniqByLabels: ['branch'],
        },
        'custom',
        ctx,
    );

    assert.deepEqual(await getStatuses(), {
        [hashOf('cfg-a')]: 'queued',
        [hashOf('cfg-b')]: 'queued',
        'previous-branch': 'deleting',
    });
});

test('closed pull request with incomplete labels deletes nothing', async () => {
    await insert('source-only', {labels: {source: 'configs'}});
    await insert('configs-pr', {
        labels: {source: 'configs', branch: 'users/someone/pr', instance: 'ru-preprod'},
    });

    await closed({
        project: 'console',
        branch: 'trunk',
        labels: {source: 'configs', branch: ''},
        uniqByLabels: ['source', 'branch', 'instance'],
    });

    assert.deepEqual(await getStatuses(), {
        'configs-pr': 'generated',
        'source-only': 'generated',
    });
});

test('closed pull request with uniqByLabels and empty labels deletes nothing', async () => {
    await insert('mine', {labels: {owner: 'data-transfer'}});

    await closed({
        project: 'console',
        branch: 'trunk',
        labels: {branch: ''},
        uniqByLabels: ['branch'],
    });

    assert.deepEqual(await getStatuses(), {mine: 'generated'});
});
