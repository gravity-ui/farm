import {normalizeSecretEnv, registerSecrets} from './secret-env';

function wrapValue(value: string) {
    if (value.startsWith('"') && value.endsWith('"')) {
        return value;
    }
    return `"${value}"`;
}

export function buildEnvVariablesStrPairArr(
    variables: Record<string, string>,
    opts?: {
        noWrap?: boolean;
    },
) {
    const normalized = normalizeSecretEnv(variables);
    return Object.keys(normalized).map((envKey) => {
        const needWrap = !opts?.noWrap;
        const strValue = String(normalized[envKey]);
        const envValue = needWrap ? wrapValue(strValue) : strValue;
        return `${envKey}=${envValue}`;
    });
}

export function buildEnvVariablesString(variables: Record<string, string>) {
    return buildEnvVariablesStrPairArr(variables).join(' ');
}

export function buildInheritedEnv(envInheritance: Record<string, string>): Record<string, string> {
    return Object.entries(envInheritance).reduce(
        (acc, [envName, envSource]) => {
            const inheritedValue = process.env[envSource];
            if (typeof inheritedValue === 'string') {
                acc[envName] = inheritedValue;
                registerSecrets({[envName]: inheritedValue});
            }
            return acc;
        },
        {} as Record<string, string>,
    );
}

export function createEnvBuilder() {
    const result: Record<string, string | undefined> = {};

    return {
        result,
        addHighPriority(env: typeof result) {
            Object.assign(result, normalizeSecretEnv(env));
        },
        addLowPriority(env: typeof result) {
            Object.assign(result, {...normalizeSecretEnv(env), ...result});
        },
    };
}
