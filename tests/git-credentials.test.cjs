const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, test} = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-git-test-'));
const token = 'demo-credential:/+ value';
process.env.ENV_TEST_SECRET = token;
process.env.FARM_WORKDIR = path.join(directory, 'work dir');
process.env.FARM_ENV_PATH = path.join(directory, 'farm.cjs');
process.env.FARM_DB_FILE_PATH = path.join(directory, 'farm.db');
fs.writeFileSync(
    process.env.FARM_ENV_PATH,
    `module.exports = ${JSON.stringify({farmProvider: {name: 'test'}, projects: {sample: {repositoryPath: 'owner/sample', vcs: 'git', vcsCredentials: {git: {authTokenEnvName: 'ENV_TEST_SECRET'}}}}})};`,
);
require('ts-node/register');
const shell = require('shelljs');
const {executeRun} = require('../src/server/utils/async.ts');
const {
    redactGitText,
    redactGitLogRows,
    createGitLogStream,
} = require('../src/server/utils/redact-git-logs.ts');
const {
    withGitCredentials,
    quoteGitArgument,
} = require('../src/server/utils/vcs/git-credentials.ts');
const {GitVcs} = require('../src/server/utils/vcs/git.ts');
const {knexInstance} = require('../src/server/utils/db/knex.ts');
const {insertInstanceLogs, listInstanceBuildLogs} = require('../src/server/utils/db/index.ts');

after(async () => {
    await knexInstance.destroy();
    fs.rmSync(directory, {recursive: true, force: true});
});

test('askpass supplies credentials only for the selected HTTPS authority and is removed', async () => {
    let file;
    await withGitCredentials('github.com', token, async (env) => {
        file = env.GIT_ASKPASS;
        const run = (prompt) => execFileSync(file, [prompt], {env, encoding: 'utf8'});
        assert.equal(fs.statSync(file).mode & 0o777, 0o700);
        assert.equal(run("Username for 'https://github.com': "), 'x-access-token\n');
        assert.equal(run("Password for 'https://x-access-token@github.com': "), token + '\n');
        for (const host of ['github.com.evil.test', 'evil.test']) {
            assert.throws(() => run(`Password for 'https://x-access-token@${host}': `));
        }
        assert.ok(!fs.readFileSync(file, 'utf8').includes(token));
    });
    assert.equal(fs.existsSync(file), false);
});

test('askpass is cleaned after failure and shell quoting preserves literal arguments', async () => {
    let file;
    await assert.rejects(
        withGitCredentials('github.com', token, async (env) => {
            file = env.GIT_ASKPASS;
            throw new Error('demo failure');
        }),
        /demo failure/,
    );
    assert.equal(fs.existsSync(file), false);
    const value = "branch'$(false)";
    assert.equal(
        execFileSync('/bin/sh', ['-c', `printf %s ${quoteGitArgument(value)}`], {encoding: 'utf8'}),
        value,
    );
});

test('known raw and encoded credentials and historical GitHub URL credentials are masked', () => {
    const value = `${token} ${encodeURIComponent(token)} https://retired-secret@github.com/owner/repo ghp_dummyFixture`;
    const result = redactGitText(value);
    assert.ok(!result.includes(token));
    assert.ok(!result.includes(encodeURIComponent(token)));
    assert.ok(!result.includes('retired-secret'));
    assert.ok(!result.includes('ghp_dummyFixture'));
});

test('split log fragments and historical rows cannot reconstruct a known token', () => {
    const oldToken = process.env.ENV_TEST_SECRET;
    process.env.ENV_TEST_SECRET = 'ghp_dummyLongCredential';
    const githubStream = createGitLogStream();
    assert.equal(githubStream('ghp_dummy'), '');
    assert.equal(githubStream('LongCredential', true), '[REDACTED]');
    process.env.ENV_TEST_SECRET = oldToken;
    const write = createGitLogStream();
    const middle = Math.floor(token.length / 2);
    assert.equal(write('before ' + token.slice(0, middle)), 'before ');
    assert.equal(write(token.slice(middle) + ' after', true), '[REDACTED] after');
    const rows = redactGitLogRows([
        {stdout: token.slice(0, middle), code: 0},
        {stdout: token.slice(middle), code: 0},
    ]);
    assert.equal(rows.map((row) => row.stdout).join(''), '[REDACTED]');
});

test('checkout uses credential-free URLs, isolated environment and literal branch arguments', async () => {
    const original = shell.exec;
    let captured;
    shell.exec = (command, options, callback) => {
        captured = {command, options};
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        process.nextTick(() => callback(0, '', ''));
        return child;
    };
    try {
        await new GitVcs().checkout({
            project: 'sample',
            branch: "branch'$(false)",
            instanceDir: 'preview',
        });
        assert.ok(captured.command.includes('https://github.com/owner/sample.git'));
        assert.ok(!captured.command.includes(token));
        assert.ok(captured.command.includes(quoteGitArgument("branch'$(false)")));
        assert.equal(captured.options.env.FARM_GIT_ASKPASS_TOKEN, token);
        assert.equal(fs.existsSync(captured.options.env.GIT_ASKPASS), false);
    } finally {
        shell.exec = original;
    }
});

test('successful command return values remain functional while callbacks and failures are masked', async () => {
    const command = `printf %s "$ENV_TEST_SECRET"`;
    const output = [];
    const result = await executeRun(command, {}, (entry) => output.push(entry));
    assert.equal(result.stdout, token);
    assert.ok(!JSON.stringify(output).includes(token));
    await assert.rejects(executeRun(command + '; exit 2'), (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, '[REDACTED]');
        return true;
    });
});

test('database writes and legacy reads mask credential-bearing log fields', async () => {
    await knexInstance.schema.createTable('instance_build_logs', (table) => {
        table.increments('id');
        for (const key of ['hash', 'stdout', 'stderr', 'command', 'created']) table.text(key);
        table.integer('duration');
        table.integer('code');
    });
    const log = {
        stdout: token,
        stderr: encodeURIComponent(token),
        command: 'git ' + token,
        code: 1,
        duration: 1,
    };
    await insertInstanceLogs('new', [log]);
    assert.ok(
        !JSON.stringify(await knexInstance('instance_build_logs').where({hash: 'new'})).includes(
            token,
        ),
    );
    await knexInstance('instance_build_logs').insert({
        hash: 'old',
        stdout: 'https://old-credential@github.com/repo',
        created: '1',
    });
    assert.ok(!JSON.stringify(await listInstanceBuildLogs('old')).includes('old-credential'));
});
