import type {ListQueueRequest, ListQueueResponse} from '../../../shared/api/listQueue';
import type {ApiAction} from '../../../shared/common';
import * as db from '../../utils/db';

const listQueue: ApiAction<ListQueueRequest, ListQueueResponse> = async () => {
    try {
        const instances = await db.listCurrentQueue();

        return {ok: true, data: {instances}};
    } catch (error) {
        return {ok: false, error, message: 'Failed to get queue stats'};
    }
};

export default listQueue;
