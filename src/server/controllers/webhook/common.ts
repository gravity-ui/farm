import type {InstanceInfo} from '../../models/common';
import {getInstance} from '../../utils/db';
import * as instanceUtils from '../../utils/instance';

export async function getCurrentInstanceAndGenerate({
    envVariables,
    runEnvVariables,
    hash,
    ...rest
}: InstanceInfo) {
    if (!hash) {
        throw new Error('instance hash not found');
    }
    const currentInstance = await getInstance(hash);
    const vars: Record<string, string> = {...currentInstance?.envVariables, ...envVariables};
    const runVars: Record<string, string> = {
        ...currentInstance?.runEnvVariables,
        ...runEnvVariables,
    };

    await instanceUtils.addInstanceToGenerateQueue({
        ...rest,
        envVariables: vars,
        runEnvVariables: runVars,
        hash,
    });
}

export function getMatchedItems(
    regexp?: RegExp | null,
    data?: {branch?: string; prTitle?: string; prBody?: string},
) {
    const items: string[] = [];

    if (!data) {
        return items;
    }

    const {branch, prTitle, prBody} = data;

    if (!regexp) {
        return items;
    }

    const matchAll = (str: string) => Array.from(str.matchAll(regexp)).map((m) => m[0]);

    [branch, prTitle, prBody]
        .filter((i) => i?.match(regexp))
        .forEach((i) => i && items.push(...matchAll(i)));

    return items;
}
