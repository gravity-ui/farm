import type {TouchInstanceRequest, TouchInstanceResponse} from '../../../shared/api/touchInstance';
import type {ApiAction} from '../../../shared/common';
import {getGlobalFarmConfig} from '../../utils/common';
import * as db from '../../utils/db';

const touchInstance: ApiAction<TouchInstanceRequest, TouchInstanceResponse> = async ({data}) => {
    if (!getGlobalFarmConfig().instanceActivityTrackingEnabled) {
        return {ok: true};
    }

    if (!data.hash || typeof data.hash !== 'string') {
        return {ok: false, message: 'Instance hash is required', status: 400};
    }

    try {
        await db.updateInstanceLastActivityAt(data.hash);

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
