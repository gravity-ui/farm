import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const askpass = `#!/bin/sh
set +x
case "\${1:-}" in
    "Username for 'https://\${FARM_GIT_ASKPASS_HOST}'"*) printf '%s\\n' 'x-access-token' ;;
    "Password for 'https://x-access-token@\${FARM_GIT_ASKPASS_HOST}'"*)
        test -n "\${FARM_GIT_ASKPASS_TOKEN:-}" || exit 1
        printf '%s\\n' "$FARM_GIT_ASKPASS_TOKEN" ;;
    *) exit 1 ;;
esac
`;

export function quoteGitArgument(value: string): string {
    return "'" + value.replace(/'/g, "'\\''") + "'";
}

export async function withGitCredentials<T>(
    hostname: string,
    token: string | undefined,
    callback: (env: NodeJS.ProcessEnv) => Promise<T>,
): Promise<T> {
    const directory = await mkdtemp(join(tmpdir(), 'farm-git-'));
    try {
        const file = join(directory, 'askpass');
        await writeFile(file, askpass, {mode: 0o700});
        return await callback({
            GIT_ASKPASS: file,
            GIT_TERMINAL_PROMPT: '0',
            FARM_GIT_ASKPASS_HOST: hostname,
            FARM_GIT_ASKPASS_TOKEN: token || '',
            LC_ALL: 'C',
        });
    } finally {
        await rm(directory, {recursive: true, force: true});
    }
}
