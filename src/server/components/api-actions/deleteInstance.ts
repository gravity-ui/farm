import type {
    DeleteInstanceRequest,
    DeleteInstanceResponse,
} from '../../../shared/api/deleteInstance';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import * as db from '../../utils/db';
import * as instanceUtils from '../../utils/instance';

const deleteInstance: ApiAction<DeleteInstanceRequest, DeleteInstanceResponse> = async ({
    data,
    ctx,
}) => {
    try {
        const instance = await db.getInstance(data.hash);
        if (!instance) {
            return {ok: false, message: 'Instance not found'};
        }

        await instanceUtils.addInstanceToDeleteQueue(instance);

        return {ok: true, data: {message: 'Success'}};
    } catch (error) {
        const message = 'Error occurred while deleting instance';
        ctx.logError(message, wrapInternalError(error));

        return {ok: false, data: {message, error}};
    }
};

export default deleteInstance;
