import {isSecretEnvKey} from '../../shared/secret-env';

export const normalizeEnvValue = (key: string, value: string) =>
    isSecretEnvKey(key.trim()) ? value : value.trim();

export const prepareEnvFormVariables = (
    variables: {key: string; value: string}[] = [],
    prefix: string,
) =>
    Object.fromEntries(
        variables
            .filter(({key, value}) => key && value)
            .map(({key, value}) => [`${prefix}${key.trim()}`, normalizeEnvValue(key, value)]),
    );
