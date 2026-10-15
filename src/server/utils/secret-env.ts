import {ENV_PREFIX, RUN_ENV_PREFIX} from '../../shared/constants';
import {MASKED_SECRET_VALUE, getEnvKey, isSecretEnvKey} from '../../shared/secret-env';

const secretValues = new Set<string>();

function collectSecrets(source: unknown, values: Set<string>, seen = new WeakSet<object>()): void {
    if (!source || typeof source !== 'object' || seen.has(source)) return;
    seen.add(source);
    for (const [key, value] of Object.entries(source)) {
        const envKey = key.startsWith(ENV_PREFIX)
            ? key.slice(ENV_PREFIX.length)
            : key.startsWith(RUN_ENV_PREFIX)
              ? key.slice(RUN_ENV_PREFIX.length)
              : key;
        if (
            isSecretEnvKey(envKey) &&
            typeof value === 'string' &&
            value &&
            value !== MASKED_SECRET_VALUE
        ) {
            values.add(value);
        }
        if (key === 'envInheritance' && value && typeof value === 'object') {
            collectSecrets(
                Object.fromEntries(
                    Object.entries(value).map(([name, sourceName]) => [
                        name,
                        typeof sourceName === 'string' ? process.env[sourceName] : undefined,
                    ]),
                ),
                values,
                seen,
            );
        } else collectSecrets(value, values, seen);
    }
}

export function getSecretValues(source: unknown): string[] {
    const values = new Set<string>();
    collectSecrets(source, values);
    return Array.from(values);
}

export function registerSecretValues(values: string[]): void {
    for (const value of values) {
        if (value && value !== MASKED_SECRET_VALUE) secretValues.add(value);
    }
}

export function registerSecrets(source: unknown): void {
    registerSecretValues(getSecretValues(source));
}

function getSecretVariants(value: string): Set<string> {
    const variants = new Set([value, JSON.stringify(value).slice(1, -1)]);
    try {
        variants.add(encodeURIComponent(value));
    } catch {
        return variants;
    }
    return variants;
}

export function redactSecretText(text: string, knownValues = secretValues): string {
    const values = Array.from(knownValues).sort((a, b) => b.length - a.length);
    for (const value of values) {
        for (const variant of getSecretVariants(value)) {
            text = text
                .split(MASKED_SECRET_VALUE)
                .map((part) => part.split(variant).join(MASKED_SECRET_VALUE))
                .join(MASKED_SECRET_VALUE);
        }
    }
    return text;
}

export function maskSecrets<T>(source: T): T {
    const knownValues = new Set([...secretValues, ...getSecretValues(source)]);
    const textFields = new Set([
        'stdout',
        'stderr',
        'command',
        'message',
        'stack',
        'log',
        'content',
        'value',
        'error',
        'details',
        'description',
        'labels',
        'requestUrl',
        'step',
    ]);
    const envFields = new Set(['env', 'runEnv', 'envVariables', 'runEnvVariables']);
    const seenPlain = new WeakMap<object, unknown>();
    const seenText = new WeakMap<object, unknown>();
    const visit = (value: unknown, text = false): unknown => {
        if (typeof value === 'string') return text ? redactSecretText(value, knownValues) : value;
        if (!value || typeof value !== 'object') return value;
        if (value instanceof Error) text = true;
        const seen = text ? seenText : seenPlain;
        if (seen.has(value)) return seen.get(value);
        if (value instanceof Date) return new Date(value.getTime());
        const result: Record<string, unknown> | unknown[] =
            value instanceof Error
                ? Object.create(Object.getPrototypeOf(value))
                : Array.isArray(value)
                  ? []
                  : {};
        seen.set(value, result);
        for (const key of Object.getOwnPropertyNames(value)) {
            if (Array.isArray(value) && key === 'length') continue;
            Object.defineProperty(result, key, {
                enumerable: true,
                configurable: true,
                writable: true,
                value:
                    isSecretEnvKey(key) ||
                    (key.startsWith(ENV_PREFIX) && isSecretEnvKey(key.slice(ENV_PREFIX.length))) ||
                    (key.startsWith(RUN_ENV_PREFIX) &&
                        isSecretEnvKey(key.slice(RUN_ENV_PREFIX.length)))
                        ? MASKED_SECRET_VALUE
                        : visit(
                              (value as Record<string, unknown>)[key],
                              text || textFields.has(key) || envFields.has(key),
                          ),
            });
        }
        return result;
    };
    return visit(source, typeof source === 'string') as T;
}

export function normalizeSecretEnv<T extends string | undefined>(
    env: Record<string, T> = {},
): Record<string, T> {
    if (
        Object.keys(env).some(
            (key) => isSecretEnvKey(key) && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(getEnvKey(key)),
        )
    ) {
        throw new Error('Invalid secret environment key');
    }
    if (
        Object.entries(env).some(
            ([key, value]) => isSecretEnvKey(key) && value === MASKED_SECRET_VALUE,
        )
    ) {
        throw new Error('Secret value must be provided');
    }
    registerSecrets(env);
    return Object.fromEntries(Object.entries(env).map(([key, value]) => [getEnvKey(key), value]));
}

export function mergeSecretEnv(
    ...layers: (Record<string, string> | undefined)[]
): Record<string, string> {
    return Object.assign({}, ...layers.map((layer) => normalizeSecretEnv(layer)));
}

export function restoreMaskedSecrets(
    variables: Record<string, string>,
    stored?: Record<string, string>,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(variables).map(([key, value]) => {
            if (!isSecretEnvKey(key) || value !== MASKED_SECRET_VALUE) return [key, value];
            const original = stored?.[key];
            if (original === undefined || original === MASKED_SECRET_VALUE)
                throw new Error('Secret value must be provided');
            return [key, original];
        }),
    );
}

export function normalizeInstanceEnv<
    T extends {envVariables?: Record<string, string>; runEnvVariables?: Record<string, string>},
>(instance: T): T {
    return {
        ...instance,
        envVariables: normalizeSecretEnv(instance.envVariables),
        runEnvVariables: normalizeSecretEnv(instance.runEnvVariables),
    };
}

export function createSecretTextStream() {
    let pending = '';
    return {
        write(chunk: string, final = false): string {
            const text = redactSecretText(pending + chunk);
            pending = '';
            if (text.endsWith(MASKED_SECRET_VALUE)) return text;
            let retained = 0;
            for (const value of secretValues) {
                for (const variant of getSecretVariants(value)) {
                    for (
                        let length = Math.min(variant.length - 1, text.length);
                        length > retained;
                        length--
                    ) {
                        if (text.endsWith(variant.slice(0, length))) {
                            retained = length;
                            break;
                        }
                    }
                }
            }
            if (final) return retained ? text.slice(0, -retained) + MASKED_SECRET_VALUE : text;
            if (retained) pending = text.slice(-retained);
            return retained ? text.slice(0, -retained) : text;
        },
        finish(): string {
            const result = pending ? MASKED_SECRET_VALUE : '';
            pending = '';
            return result;
        },
    };
}

export function createSecretLogRedactor() {
    const stdout = createSecretTextStream();
    const stderr = createSecretTextStream();
    return {
        redact<
            T extends {
                stdout?: string | null;
                stderr?: string | null;
                code?: string | number | null;
            },
        >(logs: T[]): T[] {
            return logs.map((log) => {
                const terminal = log.code !== null && log.code !== undefined;
                return {
                    ...maskSecrets(log),
                    stdout: stdout.write(log.stdout || '', terminal),
                    stderr: stderr.write(log.stderr || '', terminal),
                };
            });
        },
        finish() {
            return {stdout: stdout.finish(), stderr: stderr.finish()};
        },
    };
}

export function maskLogFragments<
    T extends {stdout?: string | null; stderr?: string | null; code?: string | number | null},
>(logs: T[]): T[] {
    const redactor = createSecretLogRedactor();
    const result = redactor.redact(logs);
    const tail = redactor.finish();
    if (result.length) {
        result[result.length - 1].stdout = (result[result.length - 1].stdout || '') + tail.stdout;
        result[result.length - 1].stderr = (result[result.length - 1].stderr || '') + tail.stderr;
    }
    return result;
}
