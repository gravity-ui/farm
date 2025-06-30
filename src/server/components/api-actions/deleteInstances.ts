import type {
    DeleteInstancesRequest,
    DeleteInstancesResponse,
} from '../../../shared/api/deleteInstances';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import * as db from '../../utils/db';
import * as instanceUtils from '../../utils/instance';

const deleteInstances: ApiAction<DeleteInstancesRequest, DeleteInstancesResponse> = async ({
    data,
    ctx,
}) => {
    try {
        const instances = await db.getInstancesByHashes(data.hashes);
        if (!instances) {
            return {ok: false, message: 'Instances not found'};
        }

        await Promise.all(
            instances.map((instance) => instanceUtils.addInstanceToDeleteQueue(instance)),
        );

        return {ok: true, data: {message: 'Successfully deleted instances'}};
    } catch (error) {
        const message = 'Error occurred while deleting instances';
        ctx.logError(message, wrapInternalError(error));

        return {ok: false, data: {message, error}};
    }
};

export default deleteInstances;
