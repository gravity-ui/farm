import React from 'react';

const palette = [
    'var(--g-color-text-secondary)',
    'var(--g-color-text-danger)',
    'var(--g-color-text-positive)',
    'var(--g-color-text-warning)',
    'var(--g-color-text-info)',
    'var(--g-color-text-utility)',
    'var(--g-color-text-info)',
    'var(--g-color-text-primary)',
];

function severityColor(line: string): string | undefined {
    let level: unknown;
    try {
        const parsed: unknown = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'level' in parsed) {
            level = parsed.level;
        }
    } catch {
        level = line.match(
            /^\s*(?:\[[^\]]+\]\s*)?\[?(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\b/i,
        )?.[1];
    }
    if (typeof level === 'number') {
        if (level >= 50) return palette[1];
        if (level >= 40) return palette[3];
        if (level >= 30) return palette[4];
        return palette[0];
    }
    if (typeof level !== 'string') return undefined;
    switch (level.toLowerCase()) {
        case 'fatal':
        case 'error':
            return palette[1];
        case 'warn':
        case 'warning':
            return palette[3];
        case 'info':
            return palette[4];
        case 'debug':
        case 'trace':
            return palette[0];
        default:
            return undefined;
    }
}

export function LogText({text}: {text: string}) {
    let color: string | undefined;
    let bold = false;
    return (
        <React.Fragment>
            {text.split('\n').map((line, lineIndex) => {
                const children: React.ReactNode[] = [];
                const severity = line.includes('\u001b[') ? undefined : severityColor(line);
                // eslint-disable-next-line no-control-regex
                const sgr = /\u001b\[([0-9;]*)m/g;
                let start = 0;
                const append = (end: number) => {
                    if (end > start) {
                        children.push(
                            <span
                                key={children.length}
                                style={{
                                    color: color || severity,
                                    fontWeight: bold ? 'bold' : undefined,
                                }}
                            >
                                {line.slice(start, end)}
                            </span>,
                        );
                    }
                };
                for (let match = sgr.exec(line); match; match = sgr.exec(line)) {
                    append(match.index);
                    const codes = match[1].split(';').map(Number);
                    for (let index = 0; index < codes.length; index++) {
                        const code = codes[index];
                        if (code === 0) {
                            color = undefined;
                            bold = false;
                        } else if (code === 1) {
                            bold = true;
                        } else if (code === 22) {
                            bold = false;
                        } else if (code === 39) {
                            color = undefined;
                        } else if (code >= 30 && code <= 37) {
                            color = palette[code - 30];
                        } else if (code >= 90 && code <= 97) {
                            color = palette[code - 90];
                        } else if (code === 38 || code === 48 || code === 58) {
                            // skip extended color parameters rather than treating them as SGR commands
                            index +=
                                codes[index + 1] === 2
                                    ? 4
                                    : codes[index + 1] === 5
                                      ? 2
                                      : codes.length;
                        }
                    }
                    start = match.index + match[0].length;
                }
                append(line.length);
                return (
                    <React.Fragment key={lineIndex}>
                        {lineIndex > 0 ? '\n' : ''}
                        {children}
                    </React.Fragment>
                );
            })}
        </React.Fragment>
    );
}
