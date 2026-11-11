const assert = require('node:assert/strict');
const Module = require('node:module');
const {after, test} = require('node:test');

require('ts-node/register');
const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
    if (request === './common' && parent.filename.endsWith('/redact-git-logs.ts')) {
        return {
            getAllProjectNames: () => ['sample'],
            getProjectFarmConfig: () => ({
                vcsCredentials: {git: {authTokenEnvName: 'ENV_TEST_SECRET'}},
            }),
        };
    }
    return originalLoad.call(this, request, parent, ...rest);
};
let createGitLogStream;
let redactGitLogRows;
try {
    ({createGitLogStream, redactGitLogRows} = require('../src/server/utils/redact-git-logs.ts'));
} finally {
    Module._load = originalLoad;
}
const originalToken = process.env.ENV_TEST_SECRET;
after(() => {
    if (originalToken === undefined) delete process.env.ENV_TEST_SECRET;
    else process.env.ENV_TEST_SECRET = originalToken;
});

test('final chunks and empty flushes preserve ordinary text ending in a token prefix', () => {
    process.env.ENV_TEST_SECRET = 'ghp_dummyFixture';
    const direct = createGitLogStream();
    assert.equal(direct('Building', true), 'Building');
    const flush = createGitLogStream();
    assert.equal(flush('Building'), 'Buildin');
    assert.equal(flush('', true), 'g');
    assert.equal(flush('', true), '');
    for (let length = 1; length < process.env.ENV_TEST_SECRET.length; length++) {
        const prefix = process.env.ENV_TEST_SECRET.slice(0, length);
        const write = createGitLogStream();
        const result = write(prefix) + write('', true);
        assert.equal(result, /^ghp_\w+$/.test(prefix) ? '[REDACTED]' : prefix);
    }
});

test('raw and encoded secrets remain masked at every chunk boundary without character loss', () => {
    for (const token of ['ghp_dummyFixture', 'demo-credential:/+ value']) {
        process.env.ENV_TEST_SECRET = token;
        for (const variant of new Set([token, encodeURIComponent(token)])) {
            for (let split = 0; split <= variant.length; split++) {
                const write = createGitLogStream();
                assert.equal(
                    write('before ' + variant.slice(0, split)) +
                        write(variant.slice(split) + ' after', true),
                    'before [REDACTED] after',
                );
            }
            const write = createGitLogStream();
            const result = [...variant].map((character) => write(character)).join('');
            assert.equal(result + write(' done', true), '[REDACTED] done');
        }
    }
});

test('rows keep independent stdout and stderr tails and flush plain final prefixes', () => {
    process.env.ENV_TEST_SECRET = 'demo-credential:/+ value';
    const token = process.env.ENV_TEST_SECRET;
    const encoded = encodeURIComponent(token);
    for (let split = 1; split < token.length; split++) {
        const rows = redactGitLogRows([
            {stdout: 'out ' + token.slice(0, split), stderr: 'err ' + encoded.slice(0, split)},
            {stdout: token.slice(split) + ' done', stderr: encoded.slice(split) + ' done'},
        ]);
        assert.equal(rows.map((row) => row.stdout).join(''), 'out [REDACTED] done');
        assert.equal(rows.map((row) => row.stderr).join(''), 'err [REDACTED] done');
    }
    process.env.ENV_TEST_SECRET = 'ghp_dummyFixture';
    const rows = redactGitLogRows([
        {stdout: 'Building', stderr: 'Logging'},
        {stdout: '', stderr: ''},
    ]);
    assert.equal(rows.map((row) => row.stdout).join(''), 'Building');
    assert.equal(rows.map((row) => row.stderr).join(''), 'Logging');
});
