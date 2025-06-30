import _ from 'lodash';

import type {ListLogsRequest, ListLogsResponse} from '../../../shared/api/listLogs';
import type {ApiAction, Instance, Output} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import * as db from '../../utils/db';

const instanceWasNotFoundResponse = {
    ok: false,
    message: 'Instance not found',
    data: {
        finished: true,
        logs: [],
    },
};

const listLogs: ApiAction<ListLogsRequest, ListLogsResponse> = async ({data, ctx}) => {
    if (!data.hash) {
        return instanceWasNotFoundResponse;
    }

    let logs: Output[] = [];
    let message;
    let instance: Instance | undefined;

    try {
        instance = await db.getInstance(data.hash);
        if (!instance) {
            return instanceWasNotFoundResponse;
        }

        logs = await db.listInstanceBuildLogs(data.hash);
        const finished =
            instance.status === 'generated' ||
            instance.status === 'deleting' ||
            instance.status === 'errored';

        return {
            ok: true,
            data: {
                logs,
                message: finished && _.isEmpty(logs) ? 'Logs are empty' : undefined,
                status: instance.status,
                finished,
            },
        };
    } catch (error) {
        message = 'Error occurred while read instance build logs';
        if (error instanceof Error) {
            ctx.logError(message, wrapInternalError(error));
        }

        return {
            ok: false,
            message,
            data: {
                logs,
                finished: true,
            },
        };
    }
};

export default listLogs;
