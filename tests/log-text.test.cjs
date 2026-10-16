'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/ui/components/LogText/LogText.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true},
}).outputText;
const rendererModule = new Module(filename, module);
rendererModule.filename = filename;
rendererModule.paths = Module._nodeModulePaths(path.dirname(filename));
rendererModule._compile(compiled, filename);
const {LogText} = rendererModule.exports;
const render = (text) => renderToStaticMarkup(React.createElement(LogText, {text}));

test('ANSI basic and bright colors render safely with reset and bold', () => {
    const html = render('\x1b[31;1merror\x1b[0m plain\n\x1b[92mok\x1b[39m end');
    assert.match(html, /color:var\(--g-color-text-danger\);font-weight:bold/);
    assert.match(html, /<span> plain<\/span>/);
    assert.match(html, /color:var\(--g-color-text-positive\)/);
    assert.match(html, /<span> end<\/span>/);
    assert.ok(!html.includes('\x1b[31'));
});

test('Pino JSON and pretty log levels are colored without rewriting content', () => {
    const json = '{"level":50,"msg":"failure","token":"[REDACTED]"}';
    assert.match(render(json), /--g-color-text-danger/);
    assert.match(render(json), /&quot;token&quot;:&quot;\[REDACTED\]&quot;/);
    assert.match(render('[12:34:56] WARN: warning'), /--g-color-text-warning/);
    assert.match(render('{"level":"info","msg":"ready"}'), /--g-color-text-info/);
    assert.equal(render('plain\ntext'), '<span>plain</span>\n<span>text</span>');
});

test('log text cannot become HTML, links, or injected styles', () => {
    const html = render(
        '\x1b[31m<img src=x onerror=alert(1)><script>alert(2)</script>\x1b[0m [REDACTED]',
    );
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('<script'));
    assert.match(html, /&lt;img/);
    assert.match(html, /\[REDACTED\]/);
    const escape = render('\x1b]8;;javascript:alert(1)\x07link\x1b]8;;\x07');
    assert.ok(!escape.includes('<a'));
});

test('extended color payloads do not become separate formatting commands', () => {
    const html = render('\x1b[38;5;31mtext\x1b[0m');
    assert.equal(html, '<span>text</span>');
});

test('named JSON levels take precedence over numeric logger scales', () => {
    for (const [level, levelStr, color] of [
        [20000, 'INFO', 'info'],
        [40000, 'ERROR', 'danger'],
        [50, 'WARN', 'warning'],
        [20000, 'DEBUG', 'secondary'],
    ]) {
        const line = JSON.stringify({level, levelStr, msg: 'example'});
        assert.match(render(line), new RegExp(`--g-color-text-${color}`));
    }
    assert.match(render('{"level":30,"levelStr":"unknown"}'), /--g-color-text-info/);
});

test('Pino and NodeKit numeric severity uses known levels and leaves unknown scales uncolored', () => {
    for (const [level, color] of [
        [10, 'secondary'],
        [20, 'secondary'],
        [30, 'info'],
        [40, 'warning'],
        [50, 'danger'],
        [60, 'danger'],
        [10000, 'secondary'],
        [20000, 'info'],
        [30000, 'warning'],
        [40000, 'danger'],
    ]) {
        assert.match(render(JSON.stringify({level})), new RegExp(`--g-color-text-${color}`));
    }
    for (const level of [0, 70, 2000, 50000]) {
        assert.ok(!render(JSON.stringify({level})).includes('color:'));
    }
});
