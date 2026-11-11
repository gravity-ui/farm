export const SECRET_ENV_PREFIX = 'secret:';
export const MASKED_SECRET_VALUE = '[REDACTED]';

export const isSecretEnvKey = (key: string) => key.startsWith(SECRET_ENV_PREFIX);

export const getEnvKey = (key: string) =>
    isSecretEnvKey(key) ? key.slice(SECRET_ENV_PREFIX.length) : key;
