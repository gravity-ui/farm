import type {Request, Response} from '@gravity-ui/expresskit';
import {z} from 'zod';

import type {GenerateInstanceRequest, GenerateInstanceResponse} from '../../shared/api/generate';
import {ENV_PREFIX, RUN_ENV_PREFIX} from '../../shared/constants';
import {generateInstanceHash, wrapInternalError} from '../utils/common';
import {fetchProjectConfig} from '../utils/farmJsonConfig';
import * as instanceUtils from '../utils/instance';
import type {Stats} from '../utils/stats';
import {sendStats} from '../utils/stats';

const schema = z.object({
    project: z.string(),
    branch: z.string(),
    vcs: z.string(),
    description: z.string().optional(),
    urlTemplate: z.string().optional(),
    instanceConfigName: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
});

const generate = async (req: Request, res: Response) => {
    const parsed = await schema.passthrough().safeParseAsync(req.body as GenerateInstanceRequest);

    if (!parsed.success) {
        req.ctx.logError('invalid generate request', wrapInternalError(parsed.error));
        res.sendStatus(400);
        return;
    }

    const {
        project,
        branch,
        description,
        urlTemplate,
        vcs,
        instanceConfigName = '',
        labels,
        ...restParameters
    } = parsed.data;

    const envVariables: Record<string, string> = {};
    const runEnvVariables: Record<string, string> = {};

    for (const [key, value] of Object.entries(restParameters)) {
        if (key.startsWith(ENV_PREFIX)) {
            envVariables[key.slice(ENV_PREFIX.length)] = value as string;
        }

        if (key.startsWith(RUN_ENV_PREFIX)) {
            runEnvVariables[key.slice(RUN_ENV_PREFIX.length)] = value as string;
        }
    }

    const configFile = await fetchProjectConfig({
        project,
        branch,
        vcs,
    });

    const instanceConfigNameConfig = configFile.preview.find(
        (config) => config.name === instanceConfigName,
    );

    const hash = generateInstanceHash({
        project,
        branch,
        instanceConfigName,
        vcs,
        additionalEnvVariables: envVariables,
        additionalRunEnvVariables: runEnvVariables,
    });

    let generateErrorMessage: string | null = null;

    await instanceUtils
        .addInstanceToGenerateQueue({
            project,
            branch,
            description,
            envVariables,
            runEnvVariables,
            urlTemplate: urlTemplate || instanceConfigNameConfig?.urlTemplate,
            vcs,
            instanceConfigName,
            labels,
        })
        .catch((e: Error) => {
            req.ctx.logError('GENERATE ERROR:', wrapInternalError(e));
            generateErrorMessage = e.message ?? 'Unknown error';
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

export {generate};
