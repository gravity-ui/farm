import {getAllProjectNames, getProjectFarmConfig} from './common';

function getTokenVariants(): string[] {
    const names = new Set(['GH_TOKEN', 'GIT_REPOSITORY_TOKEN', 'FARM_GIT_ASKPASS_TOKEN']);
    for (const project of getAllProjectNames()) {
        const name = getProjectFarmConfig(project).vcsCredentials?.git?.authTokenEnvName;
        if (name) names.add(name);
    }
    const result: string[] = [];
    for (const name of names) {
        const token = process.env[name];
        if (!token) continue;
        const variants = [token];
        try {
            variants.push(encodeURIComponent(token));
        } catch {
            // malformed Unicode can still be redacted in its original form
        }
        for (const variant of new Set(variants)) {
            result.push(variant);
        }
    }
    return result.sort((left, right) => right.length - left.length);
}

export function redactGitText(value: string): string {
    let result = value;
    for (const token of getTokenVariants()) result = result.split(token).join('[REDACTED]');
    return result
        .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[REDACTED]')
        .replace(/(https?:\/\/)[^\s/@]+@github\.com(?=[:/\s'"`]|$)/gi, '$1[REDACTED]@github.com');
}

export function redactGitLog<T extends object>(log: T): T {
    const result = Object.assign(
        log instanceof Error ? new Error(redactGitText(log.message)) : {},
        log,
    ) as Record<string, unknown>;
    for (const field of ['command', 'stdout', 'stderr', 'message', 'stack', 'name']) {
        const value = (log as Record<string, unknown>)[field];
        if (typeof value === 'string') result[field] = redactGitText(value);
    }
    return result as T;
}

export function createGitLogStream() {
    let pending = '';
    return (chunk: string, final = false): string => {
        let text = pending + chunk;
        for (const token of getTokenVariants()) text = text.split(token).join('[REDACTED]');
        pending = '';
        let retained = 0;
        if (!text.endsWith('[REDACTED]')) {
            for (const token of getTokenVariants()) {
                for (
                    let length = Math.min(token.length - 1, text.length);
                    length > retained;
                    length--
                ) {
                    if (text.endsWith(token.slice(0, length))) {
                        retained = length;
                        break;
                    }
                }
            }
        }
        if (retained && !final) pending = text.slice(-retained);
        return retained
            ? redactGitText(text.slice(0, -retained)) + (final ? '[REDACTED]' : '')
            : redactGitText(text);
    };
}

export function redactGitLogRows<T extends {stdout?: string | null; stderr?: string | null}>(
    rows: T[],
): T[] {
    const stdout = createGitLogStream();
    const stderr = createGitLogStream();
    return rows.map((row, index) => ({
        ...redactGitLog(row),
        stdout: stdout(row.stdout || '', index === rows.length - 1),
        stderr: stderr(row.stderr || '', index === rows.length - 1),
    }));
}
