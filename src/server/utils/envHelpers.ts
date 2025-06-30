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
    return Object.keys(variables).map((envKey) => {
        const needWrap = !opts?.noWrap;
        const strValue = String(variables[envKey]);
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
            Object.assign(result, env);
        },
        addLowPriority(env: typeof result) {
            Object.assign(result, {...env, ...result});
        },
    };
}
