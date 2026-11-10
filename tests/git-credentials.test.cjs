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

test('generic commands keep raw output while Git provider hooks mask it', async () => {
    const command = `printf %s "$ENV_TEST_SECRET"`;
    const output = [];
    const result = await executeRun(command, {}, (entry) => output.push(entry));
    assert.equal(result.stdout, token);
    assert.ok(JSON.stringify(output).includes(token));
    assert.ok(!JSON.stringify(new GitVcs().redactLogs(output)).includes(token));
    await assert.rejects(executeRun(command + '; exit 2'), (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, token);
        assert.equal(new GitVcs().redactOutput(error).stdout, '[REDACTED]');
        return true;
    });
});

test('database stays plain and provider hooks sanitize writes and historical reads', async () => {
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
    await insertInstanceLogs('raw', [log]);
    assert.equal((await listInstanceBuildLogs('raw'))[0].stdout, token);
    await insertInstanceLogs('new', new GitVcs().redactLogs([log]));
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
    assert.ok(
        !JSON.stringify(new GitVcs().redactLogs(await listInstanceBuildLogs('old'))).includes(
            'old-credential',
        ),
    );
});

test('provider build observers mask secrets split across separate output writes and flush plain tails', () => {
    const {createVcsBuildObserver} = require('../src/server/utils/vcs/logs.ts');
    const output = [];
    const sink = {next: (value) => output.push(...(value.output || [])), closed: false};
    const stream = createVcsBuildObserver(new GitVcs(), sink);
    const row = (stdout, stderr = '') => ({
        stdout,
        stderr,
        command: null,
        code: null,
        duration: null,
    });
    const middle = Math.floor(token.length / 2);
    stream.observer.next({output: [row('before ' + token.slice(0, middle))]});
    assert.equal(output.map((entry) => entry.stdout).join(''), 'before ');
    stream.observer.next({output: [row(token.slice(middle) + ' after')]});
    stream.observer.next({output: [row('demo-cred')]});
    stream.flush();
    assert.equal(output.map((entry) => entry.stdout).join(''), 'before [REDACTED] afterdemo-cred');
});

test('optional VCS hooks preserve plugin output and errors unchanged', () => {
    const {
        createVcsLogRedactor,
        createVcsBuildObserver,
        redactVcsError,
    } = require('../src/server/utils/vcs/logs.ts');
    const plugin = {};
    const rows = [{stdout: token, stderr: '', command: null, code: null, duration: null}];
    assert.equal(createVcsLogRedactor(plugin)(rows), rows);
    const error = new Error(token);
    assert.equal(redactVcsError(plugin, error), error);
    const values = [];
    const stream = createVcsBuildObserver(plugin, {next: (value) => values.push(value)});
    stream.observer.next({output: rows});
    stream.flush();
    assert.equal(values[0].output, rows);
});

test('checkout failures are sanitized before leaving the Git provider', async () => {
    const original = shell.exec;
    shell.exec = (_command, _options, callback) => {
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        process.nextTick(() => callback(1, token, token));
        return child;
    };
    try {
        await assert.rejects(
            new GitVcs().checkout({project: 'sample', branch: 'main', instanceDir: 'error'}),
            (error) => {
                assert.equal(error.stdout, '[REDACTED]');
                assert.equal(error.stderr, '[REDACTED]');
                return true;
            },
        );
    } finally {
        shell.exec = original;
    }
});

test('terminal build statuses follow both provider and queue tail persistence', async () => {
    const vm = require('node:vm');
    const ts = require('typescript');
    const {createVcsBuildObserver} = require('../src/server/utils/vcs/logs.ts');
    const source = fs.readFileSync(
        path.join(__dirname, '../src/server/utils/queue/utils.ts'),
        'utf8',
    );
    const compiled = ts.transpileModule(source + '\nexport {buildInstance};', {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
    }).outputText;
    for (const status of ['generated', 'errored']) {
        for (const withOutput of [false, true]) {
            const events = [];
            const vcs = new GitVcs();
            const dependencies = {
                '../../app': {},
                '../../components/farm-provider': {
                    getFarmProvider: () => ({
                        async buildInstance(_instance, observer) {
                            const stream = createVcsBuildObserver(vcs, observer);
                            stream.observer.next({
                                output: [
                                    {
                                        stdout: 'demo-cred',
                                        stderr: '',
                                        command: null,
                                        duration: null,
                                        code: null,
                                    },
                                ],
                            });
                            stream.flush();
                            observer.next({
                                config: {status},
                                ...(withOutput
                                    ? {
                                          output: [
                                              {
                                                  stdout: 'demo-cred',
                                                  stderr: '',
                                                  command: null,
                                                  duration: null,
                                                  code: null,
                                              },
                                          ],
                                      }
                                    : {}),
                            });
                            stream.flush();
                        },
                    }),
                },
                '../../utils/db': {
                    async insertInstanceLogs(_hash, logs) {
                        await new Promise((resolve) => setTimeout(resolve, 1));
                        events.push({logs});
                    },
                    async updateInstanceStatus(_hash, value) {
                        events.push({status: value});
                    },
                },
                '../common': {formatError: String},
                '../farmJsonConfig': {},
                '../stats': {},
                '../vcs': {getVcs: () => vcs},
                '../vcs/logs': require('../src/server/utils/vcs/logs.ts'),
            };
            const sandbox = {
                exports: {},
                console,
                require: (name) => dependencies[name] ?? require(name),
            };
            vm.runInNewContext(compiled, sandbox);
            await sandbox.exports.buildInstance({
                instance: {hash: 'fixture', vcs: 'git'},
                sendBuildStats() {},
            });
            const terminalIndex = events.findIndex((event) => event.status);
            assert.ok(terminalIndex >= 0);
            assert.equal(
                events
                    .slice(0, terminalIndex)
                    .flatMap((event) => event.logs || [])
                    .map((row) => row.stdout)
                    .join(''),
                withOutput ? 'demo-creddemo-cred' : 'demo-cred',
            );
            assert.ok(
                events
                    .slice(terminalIndex + 1)
                    .every((event) => !event.logs?.some((row) => row.stdout || row.stderr)),
            );
        }
    }
});
