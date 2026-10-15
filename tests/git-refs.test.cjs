const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');
const ts = require('typescript');

function loadGit(dependencies) {
    const source = fs.readFileSync(path.join(__dirname, '../src/server/utils/vcs/git.ts'), 'utf8');
    const module = {exports: {}};
    vm.runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true},
        }).outputText,
        {
            exports: module.exports,
            module,
            process,
            require(name) {
                if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
                return dependencies[name];
            },
        },
    );
    return module.exports.GitVcs;
}

test('PM2 and Kubernetes checkout distinguish tags from branches with reserved prefixes', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-git-refs-'));
    try {
        const source = path.join(root, 'source');
        const work = path.join(root, 'work');
        fs.mkdirSync(source);
        fs.mkdirSync(work);
        const git = (...args) =>
            execFileSync('git', args, {cwd: source, stdio: 'pipe'}).toString().trim();
        git('init', '-b', 'main');
        fs.writeFileSync(path.join(source, 'marker'), 'tag');
        git('add', '.');
        git(
            '-c',
            'user.name=Fixture',
            '-c',
            'user.email=fixture@example.invalid',
            'commit',
            '-m',
            'tag',
        );
        const tagCommit = git('rev-parse', 'HEAD');
        git('tag', 'v1');
        fs.writeFileSync(path.join(source, 'marker'), 'branch');
        git('add', '.');
        git(
            '-c',
            'user.name=Fixture',
            '-c',
            'user.email=fixture@example.invalid',
            'commit',
            '-m',
            'branch',
        );
        const branchCommit = git('rev-parse', 'HEAD');
        for (const name of ['v1', 'refs/tags/v1', 'refs/heads/v1', "feature/quote'safe"])
            git('branch', name);
        const bin = path.join(root, 'bin');
        fs.mkdirSync(bin);
        const gitPath = execFileSync('sh', ['-c', 'command -v git'], {encoding: 'utf8'}).trim();
        fs.writeFileSync(
            path.join(bin, 'git'),
            `#!/bin/sh\nexec '${gitPath}' -c 'url.file://${source}.insteadOf=https://github.com/owner/repo.git' "$@"\n`,
            {mode: 0o755},
        );
        const execute = (command) =>
            execFileSync('sh', ['-c', command], {
                env: {...process.env, PATH: `${bin}:${process.env.PATH}`},
                stdio: 'pipe',
            });
        const constants = {WORKDIR_PATH: work, TEMP_PATH: path.join(root, 'k8s')};
        const GitVcs = loadGit({
            'node:fs': fs,
            axios: {},
            '../../../shared/commit': {isCommitHash: (value) => /^[a-f0-9]{40}$/.test(value)},
            '../../constants': constants,
            '../async': {executeRun: async (command) => execute(command)},
            '../common': {
                buildPath: (...parts) =>
                    path.join(...parts.filter((part) => typeof part === 'string')),
                getAllProjectNames: () => [],
                getProjectFarmConfig: () => ({
                    repositoryPath: 'owner/repo',
                    vcsCredentials: {git: {authTokenEnvName: 'FARM_TEST_NO_TOKEN'}},
                }),
            },
            './vcs': {getCheckoutRef: ({branch, commit}) => commit || branch},
            './recent-refs': {},
        });
        const vcs = new GitVcs();
        const refs = [
            ['refs/tags/v1', tagCommit, true],
            ['v1', branchCommit, false],
            ['refs/heads/refs/tags/v1', branchCommit, false],
            ['refs/heads/refs/heads/v1', branchCommit, false],
            ["feature/quote'safe", branchCommit, false],
        ];
        for (const [index, [branch, expectedCommit, detached]] of refs.entries()) {
            await vcs.checkout({project: 'fixture', branch, instanceDir: String(index)});
            const directory = path.join(work, String(index));
            const head = execFileSync('git', ['rev-parse', 'HEAD'], {
                cwd: directory,
                encoding: 'utf8',
            }).trim();
            assert.equal(head, expectedCommit);
            const symbolic = () =>
                execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
                    cwd: directory,
                    stdio: 'pipe',
                })
                    .toString()
                    .trim();
            if (detached) assert.throws(symbolic);
            else assert.equal(symbolic(), branch.replace(/^refs\/heads\//, ''));
            constants.TEMP_PATH = path.join(root, `k8s-${index}`);
            execute(vcs.getK8sCheckoutCommands({project: 'fixture', branch}).join(' && '));
            assert.equal(
                execFileSync('git', ['rev-parse', 'HEAD'], {
                    cwd: path.join(constants.TEMP_PATH, 'owner/repo'),
                    encoding: 'utf8',
                }).trim(),
                expectedCommit,
            );
        }
    } finally {
        fs.rmSync(root, {recursive: true, force: true});
    }
});

test('reference API forwards ref type and exact query to the VCS provider', async () => {
    const source = fs.readFileSync(
        path.join(__dirname, '../src/server/components/api-actions/listBranches.ts'),
        'utf8',
    );
    const module = {exports: {}};
    let received;
    vm.runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true},
        }).outputText,
        {
            exports: module.exports,
            module,
            require(name) {
                if (name === '../../utils/common')
                    return {
                        getProjectFarmConfig: () => ({vcs: 'git'}),
                        wrapInternalError: (error) => error,
                    };
                if (name === '../../utils/vcs')
                    return {
                        getVcs: () => ({
                            listBranches: async (...args) => {
                                received = args;
                                return ['old/tag'];
                            },
                        }),
                    };
                throw new Error(`Unexpected dependency: ${name}`);
            },
        },
    );
    const result = await module.exports.default({
        data: {project: 'fixture', refType: 'tag', query: 'old/tag'},
        ctx: {},
    });
    assert.equal(result.ok, true);
    assert.equal(
        JSON.stringify(received),
        JSON.stringify(['fixture', {refType: 'tag', query: 'old/tag'}]),
    );
    assert.equal(JSON.stringify(result.data.branches), JSON.stringify(['old/tag']));
});
