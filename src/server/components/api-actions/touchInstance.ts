import type {TouchInstanceRequest, TouchInstanceResponse} from '../../../shared/api/touchInstance';
import type {ApiAction} from '../../../shared/common';
import * as db from '../../utils/db';

const ACTIVITY_DEBOUNCE_MS = 60_000;

const touchInstance: ApiAction<TouchInstanceRequest, TouchInstanceResponse> = async ({data}) => {
    if (data.source === 'healthcheck') {
        return {ok: true};
    }

    if (data.source !== 'user' && data.source !== 'test') {
        return {ok: false, message: 'Unknown activity source', status: 400};
    }

    try {
        await db.updateInstanceLastActivityAt(data.hash, ACTIVITY_DEBOUNCE_MS);

        return {ok: true};
    } catch (error) {
        return {
            ok: false,
            message: `Error occurred while touching ${data.hash}`,
            data: {error},
        };
    }
};

export default touchInstance;
