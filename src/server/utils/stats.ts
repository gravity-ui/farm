import type {AppContext} from '@gravity-ui/nodekit';
import type {Dict} from '@gravity-ui/nodekit/dist/types';
import {snakeCase} from 'lodash';

import {getGlobalFarmConfig, wrapInternalError} from './common';
import {getInstancesByStatus} from './db';

export interface Stats extends Dict {
    action: string;
    responseStatus: number;
    requestId?: string;
    requestTime: number;
    requestMethod: string;
    requestUrl: string;
    timestamp: number;
    hash?: string;
    step?: string;
}

const service = snakeCase(getGlobalFarmConfig().defaultProject).replace(/_/g, '-');

export function sendStats(data: Stats, ctx: AppContext) {
    const {
        action,
        responseStatus,
        requestId,
        requestTime,
        requestMethod,
        requestUrl,
        timestamp,
        hash,
        step,
    } = data;

    const send = async () => {
        const queued = await getInstancesByStatus({limit: 100});

        if (!ctx) return;

        try {
            ctx.stats('apiRequests', {
                service,
                action,
                responseStatus,
                requestId: requestId || '-',
                requestTime,
                requestMethod,
                requestUrl,
                timestamp,
                hash: hash ?? '',
                queue: queued.length || 0,
                step: step as string,
            });
        } catch (chError) {
            ctx.logError('Send new clickhouse stats failed', wrapInternalError(chError), data);
        }
    };

    send();
}
