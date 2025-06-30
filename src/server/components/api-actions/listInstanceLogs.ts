import type {
    ListInstanceLogsRequest,
    ListInstanceLogsResponse,
} from '../../../shared/api/listInstanceLogs';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import {getFarmProvider} from '../farm-provider';

const listInstanceLogs: ApiAction<ListInstanceLogsRequest, ListInstanceLogsResponse> = async ({
    data,
    ctx,
}) => {
    const {params, ...instance} = data;
    const {hash} = instance;
    let message, stdout, stderr;

    if (!hash) {
        message = 'No instance selected';

        return {ok: false, data: {message}};
    }

    try {
        const ret: {ok: boolean; data: {message?: string; stdout?: string; stderr?: string}} = {
            ok: true,
            data: {message},
        };

        const logs = await getFarmProvider().getInstanceLogs({
            hash,
            stdout: params?.stdOut,
            stderr: params?.stdError,
        });

        ret.data = logs;

        return ret;
    } catch (error) {
        message = 'Error occurred while read instance logs';
        ctx.logError(message, wrapInternalError(error));

        return {ok: false, data: {message, stdout, stderr}};
    }
};

export default listInstanceLogs;
