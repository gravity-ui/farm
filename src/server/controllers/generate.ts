import type {Request, Response} from '@gravity-ui/expresskit';
import {z} from 'zod';

import type {
    GenerateInstanceError,
    GenerateInstanceRequest,
    GenerateInstanceResponse,
} from '../../shared/api/generate';
import {ENV_PREFIX, LABEL_PREFIX, RUN_ENV_PREFIX} from '../../shared/constants';
import {getEnvKey, isSecretEnvKey} from '../../shared/secret-env';
import {filterEmptyObjectEntries, generateInstanceHash, wrapInternalError} from '../utils/common';
import * as db from '../utils/db';
import {fetchProjectConfig} from '../utils/farmJsonConfig';
import * as instanceUtils from '../utils/instance';
import {maskSecrets, restoreMaskedSecrets} from '../utils/secret-env';
import type {Stats} from '../utils/stats';
import {sendStats} from '../utils/stats';
import {getVcs} from '../utils/vcs';

const schema = z.object({
    project: z.string(),
    branch: z.string(),
    commit: z.string().min(1).optional(),
    secretSourceHash: z.string().min(1).optional(),
    vcs: z.string(),
    description: z.string().optional(),
    urlTemplate: z.string().optional(),
    instanceConfigName: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
    stopTimeout: z.number().optional(),
});

const sendInvalidRequest = (res: Response, fields: string[]) => {
    const uniqueFields = [...new Set(fields)];
    res.status(400).send({
        message: `Invalid request parameters: ${uniqueFields.join(', ')}`,
        fields: uniqueFields,
    } satisfies GenerateInstanceError);
};

const generateImpl = async (req: Request, res: Response) => {
    const parsed = await schema.passthrough().safeParseAsync(req.body as GenerateInstanceRequest);

    if (!parsed.success) {
        req.ctx.logError('invalid generate request', wrapInternalError(parsed.error));
        sendInvalidRequest(
            res,
            parsed.error.issues.map(({path}) => path.join('.') || 'request'),
        );
        return;
    }

    const {
        project,
        branch,
        commit,
        secretSourceHash,
        description,
        urlTemplate,
        vcs,
        instanceConfigName = '',
        labels,
        stopTimeout,
        ...restParameters
    } = parsed.data;

    if (commit !== undefined && getVcs(vcs).isValidRef?.(commit) === false) {
        sendInvalidRequest(res, ['commit']);
        return;
    }

    const envVariables: Record<string, string> = {};
    const runEnvVariables: Record<string, string> = {};
    const labelParams: Record<string, string> = {};

    const trimmedLabels = labels
        ? Object.fromEntries(
              Object.entries(labels).map(([key, value]) => [key.trim(), value.trim()]),
          )
        : undefined;

    for (const [key, value] of Object.entries(restParameters)) {
        if (key.startsWith(ENV_PREFIX)) {
            const envKey = key.slice(ENV_PREFIX.length).trim();
            if (
                typeof value !== 'string' ||
                (isSecretEnvKey(envKey) && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(getEnvKey(envKey)))
            ) {
                sendInvalidRequest(res, [key]);
                return;
            }
            const envValue = isSecretEnvKey(envKey) ? value : value.trim();
            envVariables[envKey] = envValue;
        }

        if (key.startsWith(RUN_ENV_PREFIX)) {
            const runEnvKey = key.slice(RUN_ENV_PREFIX.length).trim();
            if (
                typeof value !== 'string' ||
                (isSecretEnvKey(runEnvKey) &&
                    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(getEnvKey(runEnvKey)))
            ) {
                sendInvalidRequest(res, [key]);
                return;
            }
            const runEnvValue = isSecretEnvKey(runEnvKey) ? value : value.trim();
            runEnvVariables[runEnvKey] = runEnvValue;
        }

        if (key.startsWith(LABEL_PREFIX)) {
            const labelKey = key.slice(LABEL_PREFIX.length).trim();
            const labelValue = (value as string).trim();
            labelParams[labelKey] = labelValue;
        }
    }

    try {
        const source = secretSourceHash ? await db.getInstance(secretSourceHash) : undefined;
        const sameProject = source?.project === project ? source : undefined;
        Object.assign(envVariables, restoreMaskedSecrets(envVariables, sameProject?.envVariables));
        Object.assign(
            runEnvVariables,
            restoreMaskedSecrets(runEnvVariables, sameProject?.runEnvVariables),
        );
    } catch {
        sendInvalidRequest(res, ['secretSourceHash']);
        return;
    }

    const mergedLabels = {...trimmedLabels, ...labelParams};

    const configFile = await fetchProjectConfig({
        project,
        branch,
        commit,
        vcs,
    });

    const instanceConfigNameConfig = configFile.preview.find(
        (config) => config.name === instanceConfigName,
    );

    const finalEnvVariables = Object.fromEntries(
        Object.entries(envVariables).filter(
            ([key, value]) => key && (isSecretEnvKey(key) || value !== ''),
        ),
    );
    const finalRunEnvVariables = Object.fromEntries(
        Object.entries(runEnvVariables).filter(
            ([key, value]) => key && (isSecretEnvKey(key) || value !== ''),
        ),
    );
    const finalLabels = filterEmptyObjectEntries(mergedLabels);

    const hash = generateInstanceHash({
        project,
        branch,
        instanceConfigName,
        vcs,
        additionalEnvVariables: finalEnvVariables,
        additionalRunEnvVariables: finalRunEnvVariables,
    });

    let generateErrorMessage: string | null = null;

    await instanceUtils
        .addInstanceToGenerateQueue({
            project,
            branch,
            commit,
            description,
            envVariables: finalEnvVariables,
            runEnvVariables: finalRunEnvVariables,
            urlTemplate: urlTemplate || instanceConfigNameConfig?.urlTemplate,
            vcs,
            instanceConfigName,
            labels: finalLabels,
            stopTimeout,
        })
        .catch((e: Error) => {
            const safeError = maskSecrets({envVariables, runEnvVariables, error: e}).error;
            req.ctx.logError('GENERATE ERROR:', wrapInternalError(safeError));
            generateErrorMessage = safeError.message ?? 'Unknown error';
        });

    if (generateErrorMessage) {
        res.status(500).send(generateErrorMessage);
        return;
    }

    const stats: Stats = {
        timestamp: Date.now(),
        action: 'GENERATE_INSTANCE',
        requestTime: 0,
        requestMethod: 'POST',
        requestUrl: req.url,
        hash,
        responseStatus: 200,
        step: 'Controller request',
        requestId: req.id,
    };

    sendStats(stats, req.ctx);
    res.send({hash} satisfies GenerateInstanceResponse);
};

const generate = async (req: Request, res: Response) => {
    try {
        await generateImpl(req, res);
    } catch (error) {
        req.ctx.logError(
            'Failed to generate instance',
            wrapInternalError(maskSecrets({request: req.body, error}).error),
        );
        res.status(500).send({message: 'Failed to generate instance'});
    }
};

export {generate};
