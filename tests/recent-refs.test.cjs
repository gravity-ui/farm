'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
require('ts-node/register');
const {listRecentRefs} = require('../src/server/utils/vcs/recent-refs.ts');
const listRecentBranches = (params, request) =>
    listRecentRefs({...params, refType: 'branch'}, request);
let sequence = 0;
const parameters = () => ({token: 'secret-token', repositoryPath: `owner/repo-${sequence++}`});
const push = (name, timestamp = '2026-10-15T12:00:00Z') => ({
    ref: `refs/heads/${name}`,
    timestamp,
    activity_type: 'push',
});
function mock(activity, missing = []) {
    const calls = [];
    const request = async (options) => {
        calls.push(options);
        assert.equal(options.timeout, 5000);
        if (options.method === 'GET') return {data: activity};
        const repository = {};
        for (const match of options.data.query.matchAll(
            /(b\d+):ref\(qualifiedName:("(?:[^"\\]|\\.)*")\)/g,
        )) {
            const name = JSON.parse(match[2]).slice('refs/heads/'.length);
            repository[match[1]] = missing.includes(name) ? null : {name};
        }
        return {data: {data: {repository}}};
    };
    return {calls, request};
}

test('bounds requests and preserves default then recent existing push branches', async () => {
    const activity = [
        push('older', '2026-10-14'),
        push('newest'),
        push('newest'),
        push('deleted'),
        {ref: 'refs/tags/tag', timestamp: '2026-10-16', activity_type: 'push'},
    ];
    const {request, calls} = mock(activity, ['deleted']);
    assert.deepEqual(await listRecentBranches(parameters(), request), ['main', 'newest', 'older']);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /activity\?activity_type=push&direction=desc&per_page=100$/);
    assert.equal(calls[1].method, 'POST');
    assert.match(calls[1].url, /\/graphql$/);
});

test('limits activity to 100 entries and results to 30 without alphabetical fallback', async () => {
    const {request, calls} = mock(Array.from({length: 150}, (_, index) => push(`z-${index}`)));
    const result = await listRecentBranches(parameters(), request);
    assert.equal(result.length, 30);
    assert.deepEqual(result.slice(0, 3), ['main', 'z-0', 'z-1']);
    assert.equal([...calls[1].data.query.matchAll(/:ref\(/g)].length, 101);
});

test('handles optional default branch and excludes deleted default', async () => {
    const {request} = mock([push('feature')], ['trunk']);
    assert.deepEqual(await listRecentBranches({...parameters(), defaultBranch: 'trunk'}, request), [
        'feature',
    ]);
});

test('deduplicates in flight calls and caches copied results for 60 seconds', async () => {
    const params = parameters();
    const {request, calls} = mock([push('feature')]);
    const [first, second] = await Promise.all([
        listRecentBranches(params, request),
        listRecentBranches(params, request),
    ]);
    first.push('mutation');
    assert.deepEqual(second, ['main', 'feature']);
    assert.deepEqual(
        await listRecentBranches({...params, token: 'rotated-secret'}, request),
        second,
    );
    assert.equal(calls.length, 2);
    const now = Date.now;
    Date.now = () => now() + 61_000;
    try {
        await listRecentBranches(params, request);
    } finally {
        Date.now = now;
    }
    assert.equal(calls.length, 4);
});

test('sanitizes request failures and does not cache failures', async () => {
    const params = parameters();
    let attempts = 0;
    const request = async () => {
        attempts++;
        throw Object.assign(new Error(params.token), {
            config: {headers: {Authorization: params.token}},
        });
    };
    for (let count = 0; count < 2; count++) {
        await assert.rejects(listRecentBranches(params, request), (error) => {
            assert.equal(error.message, 'Failed to list recent refs');
            assert.equal(error.config, undefined);
            assert.equal(error.cause, undefined);
            assert.ok(!error.stack.includes(params.token));
            return true;
        });
    }
    assert.equal(attempts, 2);
});

test('rejects GraphQL errors instead of returning partial or alphabetical data', async () => {
    const {request} = mock([]);
    await assert.rejects(
        listRecentBranches(parameters(), async (options) =>
            options.method === 'POST'
                ? {data: {errors: [{message: 'secret-token'}]}}
                : request(options),
        ),
        /Failed to list recent refs/,
    );
});

test('follows activity cursors for at most three pages', async () => {
    const {request, calls} = mock([]);
    let pages = 0;
    const result = await listRecentBranches(parameters(), async (options) => {
        if (options.method !== 'GET') return request(options);
        pages++;
        assert.equal(options.timeout, 5000);
        if (pages > 1) assert.match(options.url, new RegExp(`after=cursor-${pages - 1}$`));
        return {
            data: Array.from({length: 10}, (_, index) => push(`feature-${pages}-${index}`)),
            headers: {
                link: `<https://api.github.com/repos/owner/repo/activity?after=cursor-${pages}>; rel="next"`,
            },
        };
    });
    assert.equal(pages, 3);
    assert.equal(result.length, 30);
    assert.ok(result.includes('feature-3-0'));
    assert.equal(calls.length, 1);
});

test('rejects activity pagination to another origin before sending credentials', async () => {
    let calls = 0;
    await assert.rejects(
        listRecentBranches(parameters(), async () => {
            calls++;
            return {data: [], headers: {link: '<https://other.example/activity>; rel="next"'}};
        }),
        /Failed to list recent refs/,
    );
    assert.equal(calls, 1);
});

test('lists tags in commit date order with one bounded GraphQL request', async () => {
    let calls = 0;
    const result = await listRecentRefs({...parameters(), refType: 'tag'}, async (options) => {
        calls++;
        assert.equal(options.method, 'POST');
        assert.equal(options.timeout, 5000);
        assert.match(
            options.data.query,
            /refs\(refPrefix:"refs\/tags\/",first:30,orderBy:\{field:TAG_COMMIT_DATE,direction:DESC\}\)/,
        );
        return {data: {data: {repository: {refs: {nodes: [{name: 'v2'}, {name: 'v1'}]}}}}};
    });
    assert.deepEqual(result, ['v2', 'v1']);
    assert.equal(calls, 1);
});

test('finds exact old branch and tag names without scanning, safely escaping quotes and slashes', async () => {
    for (const refType of ['branch', 'tag']) {
        for (const query of ['old/release', 'quote"branch', 'refs/tags/v1']) {
            const params = {...parameters(), refType, query};
            let calls = 0;
            const result = await listRecentRefs(params, async (options) => {
                calls++;
                assert.equal(options.method, 'POST');
                assert.equal(options.timeout, 5000);
                const match = options.data.query.match(/ref\(qualifiedName:("(?:[^"\\]|\\.)*")\)/);
                assert.equal(
                    JSON.parse(match[1]),
                    `refs/${refType === 'tag' ? 'tags' : 'heads'}/${query}`,
                );
                return {data: {data: {repository: {ref: {name: query}}}}};
            });
            assert.deepEqual(result, [query]);
            assert.equal(calls, 1);
        }
    }
});

test('returns no result for absent refs and partial matches', async () => {
    for (const ref of [null, {name: 'partial-other'}]) {
        assert.deepEqual(
            await listRecentRefs({...parameters(), query: 'partial'}, async () => ({
                data: {data: {repository: {ref}}},
            })),
            [],
        );
    }
});

test('isolates cache and in-flight requests by ref kind and exact query', async () => {
    const params = parameters();
    let calls = 0;
    const request = async (options) => {
        calls++;
        const name = options.data.query.includes('old2') ? 'old2' : 'old';
        return {data: {data: {repository: {ref: {name}}}}};
    };
    const branch = {...params, query: 'old'};
    await Promise.all([listRecentRefs(branch, request), listRecentRefs(branch, request)]);
    await listRecentRefs({...branch, refType: 'tag'}, request);
    await listRecentRefs({...branch, query: 'old2'}, request);
    await listRecentRefs({...branch, repositoryPath: params.repositoryPath.toUpperCase()}, request);
    assert.equal(calls, 3);
});

test('rejects invalid ref types and queries before requesting and sanitizes GraphQL errors', async () => {
    for (const extra of [
        {refType: 'secret-token'},
        {query: 1},
        {query: null},
        {query: 'x'.repeat(1025)},
    ]) {
        await assert.rejects(
            listRecentRefs({...parameters(), ...extra}, async () =>
                assert.fail('unexpected request'),
            ),
            {message: 'Failed to list recent refs'},
        );
    }
    for (const refType of ['branch', 'tag']) {
        await assert.rejects(
            listRecentRefs({...parameters(), refType, query: 'old'}, async () => ({
                data: {errors: [{message: 'secret-token'}]},
            })),
            (error) => {
                assert.equal(error.message, 'Failed to list recent refs');
                assert.ok(!error.stack.includes('secret-token'));
                assert.equal(error.cause, undefined);
                return true;
            },
        );
    }
});

test('bounds exact search cache and refetches evicted entries', async () => {
    const params = parameters();
    let calls = 0;
    const request = async (options) => {
        calls++;
        const match = options.data.query.match(/ref\(qualifiedName:("(?:[^"\\]|\\.)*")\)/);
        return {
            data: {
                data: {repository: {ref: {name: JSON.parse(match[1]).slice('refs/heads/'.length)}}},
            },
        };
    };
    for (let index = 0; index < 151; index++) {
        await listRecentRefs({...params, query: `old-${index}`}, request);
    }
    await listRecentRefs({...params, query: 'old-150'}, request);
    assert.equal(calls, 151);
    await listRecentRefs({...params, query: 'old-0'}, request);
    assert.equal(calls, 152);
});
