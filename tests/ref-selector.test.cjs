const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const ts = require('typescript');

function selector() {
    const slots = [];
    let cursor = 0;
    let effects = [];
    let timers = [];
    let tree;
    let ready;
    let value = 'main';
    const requests = [];
    const notifications = new Map();
    const react = {
        createElement(type, props, ...children) {
            return {type, props: {...props, children}};
        },
        useState(initial) {
            const index = cursor++;
            if (!(index in slots))
                slots[index] = typeof initial === 'function' ? initial() : initial;
            return [
                slots[index],
                (next) => {
                    slots[index] = typeof next === 'function' ? next(slots[index]) : next;
                },
            ];
        },
        useRef(initial) {
            const index = cursor++;
            return (slots[index] ||= {current: initial});
        },
        useId() {
            cursor++;
            return 'selector-error';
        },
        useEffect(effect, deps) {
            const index = cursor++;
            const previous = slots[index];
            if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
                effects.push(() => {
                    previous?.cleanup?.();
                    slots[index] = {deps, cleanup: effect()};
                });
            }
        },
    };
    const dependencies = {
        react,
        '@gravity-ui/data-source': {},
        '@gravity-ui/icons': {BranchesRight: 'branches-icon', Tag: 'tag-icon'},
        '@gravity-ui/uikit': {
            Button: 'Button',
            Icon: 'Icon',
            Loader: 'Loader',
            Select: 'Select',
            TextInput: 'TextInput',
            sp: () => '',
        },
        'react-final-form': {
            useField: () => ({
                input: {
                    value,
                    onChange: (next) => {
                        value = next;
                    },
                    onFocus() {},
                    onBlur() {},
                },
            }),
        },
        '../../../components/Fields/SelectField/SelectField': {},
        '../../../components/Fields/TextField/TextField': {},
        '../../../data-sources': {},
        '../../../i18n-common/ci18n': {ci18n: (key) => key},
        '../../../services/api': {
            request: (options) =>
                new Promise((resolve, reject) => requests.push({options, resolve, reject})),
        },
        '../../../services/toaster': {
            toaster: {
                add: (item) => notifications.set(item.name, item),
                remove: (name) => notifications.delete(name),
            },
        },
        '../../../utils/common': {
            getErrorMessageFromAxios: (error) => error.message,
            getProjectFarmConfig: () => ({defaultBranch: 'main'}),
        },
        './i18n': {i18n: (key) => key},
    };
    const module = {exports: {}};
    vm.runInNewContext(
        ts.transpileModule(
            fs.readFileSync(
                path.join(
                    __dirname,
                    '../src/ui/containers/Create/CreateFormContent/RefSelector.tsx',
                ),
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    jsx: ts.JsxEmit.React,
                    esModuleInterop: true,
                },
            },
        ).outputText,
        {
            module,
            exports: module.exports,
            require: (name) => {
                assert.ok(name in dependencies, name);
                return dependencies[name];
            },
            setTimeout: (callback) => {
                timers.push(callback);
                return callback;
            },
            clearTimeout: (callback) => {
                timers = timers.filter((timer) => timer !== callback);
            },
        },
    );
    const onReadyChange = (next) => {
        ready = next;
    };
    const render = (project = 'project') => {
        cursor = 0;
        tree = module.exports.RefSelector({project, onReadyChange});
        const pending = effects;
        effects = [];
        pending.forEach((effect) => effect());
    };
    const find = (type, label) => {
        const walk = (node) => {
            if (!node || typeof node !== 'object') return undefined;
            if (
                node.type === type &&
                (!label ||
                    node.props['aria-label'] === label ||
                    node.props.children.includes(label))
            )
                return node.props;
            return node.props?.children.flat(Infinity).map(walk).find(Boolean);
        };
        return walk(tree);
    };
    return {
        render,
        find,
        requests,
        notifications,
        runTimers: () => {
            const pending = timers;
            timers = [];
            return Promise.all(pending.map((timer) => timer()));
        },
        get ready() {
            return ready;
        },
        get value() {
            return value;
        },
    };
}

test('manual fallback requires a current failure and explicit opt-in, retry blocks it again', async () => {
    const ui = selector();
    ui.render();
    assert.equal(ui.ready, false);
    assert.equal(ui.find('TextInput'), undefined);
    const pending = ui.runTimers();
    ui.requests[0].reject(new Error('GitHub unavailable'));
    await pending;
    ui.render();
    assert.equal(ui.ready, false);
    assert.equal(ui.notifications.get('selector-error').content, 'GitHub unavailable');
    ui.find('Button', 'ref-manual').onClick();
    ui.render();
    assert.equal(ui.ready, true);
    ui.find('TextInput').onUpdate('refs/tags/literal-branch');
    ui.render();
    assert.equal(ui.value, 'refs/heads/refs/tags/literal-branch');
    assert.equal(ui.ready, true);
    ui.find('TextInput').onUpdate('');
    ui.render();
    assert.equal(ui.ready, false);
    ui.find('TextInput').onUpdate('main');
    ui.render();
    ui.find('Button', 'ref-retry').onClick();
    assert.equal(ui.ready, false);
    ui.render();
    assert.equal(ui.ready, false);
    assert.equal(ui.find('TextInput'), undefined);
    assert.equal(ui.notifications.size, 0);
    const retry = ui.runTimers();
    ui.requests[1].resolve({branches: ['main']});
    await retry;
    ui.render();
    assert.equal(ui.ready, true);
});

test('switching ref type clears manual readiness and ignores stale requests', async () => {
    const ui = selector();
    ui.render();
    const oldRequest = ui.runTimers();
    ui.find('Button', 'tags').onClick();
    ui.render();
    assert.equal(ui.ready, false);
    ui.requests[0].reject(new Error('stale branch error'));
    await oldRequest;
    ui.render();
    assert.equal(ui.find('TextInput'), undefined);
    assert.equal(ui.notifications.size, 0);
    const tagRequest = ui.runTimers();
    ui.requests[1].reject(new Error('tag error'));
    await tagRequest;
    ui.render();
    ui.find('Button', 'ref-manual').onClick();
    ui.render();
    assert.equal(ui.ready, false);
    ui.find('TextInput').onUpdate('release');
    ui.render();
    assert.equal(ui.value, 'refs/tags/release');
    assert.equal(ui.ready, true);
});
