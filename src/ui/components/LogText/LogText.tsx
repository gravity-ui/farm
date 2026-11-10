import React from 'react';

type AnsiColorCode = 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 90 | 91 | 92 | 93 | 94 | 95 | 96 | 97;

const ANSI_COLORS: Partial<Record<AnsiColorCode, string>> = {
    30: 'var(--g-color-text-secondary)',
    31: 'var(--g-color-text-danger)',
    32: 'var(--g-color-text-positive)',
    33: 'var(--g-color-text-warning)',
    34: 'var(--g-color-text-info)',
    35: 'var(--g-color-text-utility)',
    36: 'var(--g-color-text-info)',
    37: 'var(--g-color-text-primary)',
    90: 'var(--g-color-text-secondary)',
    91: 'var(--g-color-text-danger)',
    92: 'var(--g-color-text-positive)',
    93: 'var(--g-color-text-warning)',
    94: 'var(--g-color-text-info)',
    95: 'var(--g-color-text-utility)',
    96: 'var(--g-color-text-info)',
    97: 'var(--g-color-text-primary)',
};

const LEVEL_COLORS = {
    error: 'var(--g-color-text-danger)',
    warning: 'var(--g-color-text-warning)',
    info: 'var(--g-color-text-info)',
    debug: 'var(--g-color-text-secondary)',
};

function namedSeverityColor(level: unknown): string | undefined {
    if (typeof level !== 'string') return undefined;
    switch (level.toLowerCase()) {
        case 'fatal':
        case 'error':
            return LEVEL_COLORS.error;
        case 'warn':
        case 'warning':
            return LEVEL_COLORS.warning;
        case 'info':
            return LEVEL_COLORS.info;
        case 'debug':
        case 'trace':
            return LEVEL_COLORS.debug;
        default:
            return undefined;
    }
}

function severityColor(line: string): string | undefined {
    let level: unknown;
    try {
        const parsed: unknown = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
            if ('levelStr' in parsed) {
                const color = namedSeverityColor(parsed.levelStr);
                if (color) return color;
            }
            if ('level' in parsed) level = parsed.level;
        }
    } catch {
        level = line.match(
            /^\s*(?:\[[^\]]+\]\s*)?\[?(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\b/i,
        )?.[1];
    }
    if (typeof level === 'number') {
        switch (level) {
            case 50000:
            case 40000:
            case 60:
            case 50:
                return LEVEL_COLORS.error;
            case 30000:
            case 40:
                return LEVEL_COLORS.warning;
            case 20000:
            case 30:
                return LEVEL_COLORS.info;
            case 5000:
            case 10000:
            case 20:
            case 10:
                return LEVEL_COLORS.debug;
            default:
                return undefined;
        }
    }
    return namedSeverityColor(level);
}

export function LogText({text}: {text: string}) {
    let color: string | undefined;
    let bold = false;
    return (
        <React.Fragment>
            {text.split('\n').map((line, lineIndex) => {
                const children: React.ReactNode[] = [];
                // eslint-disable-next-line no-control-regex
                const csi = /\u001b\[[0-?]*[ -/]*[@-~]/g;
                const severity = severityColor(line.replace(csi, ''));
                let start = 0;
                const append = (end: number) => {
                    if (end > start) {
                        children.push(
                            <span
                                key={children.length}
                                style={{
                                    color: severity || color,
                                    fontWeight: bold ? 'bold' : undefined,
                                }}
                            >
                                {line.slice(start, end)}
                            </span>,
                        );
                    }
                };
                for (let match = csi.exec(line); match; match = csi.exec(line)) {
                    append(match.index);
                    start = match.index + match[0].length;
                    // eslint-disable-next-line no-control-regex
                    if (!/^\x1b\[[0-9;]*m$/.test(match[0])) continue;
                    const codes = match[0].slice(2, -1).split(';').map(Number);
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
                        } else if (code in ANSI_COLORS) {
                            color = ANSI_COLORS[code as AnsiColorCode];
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
