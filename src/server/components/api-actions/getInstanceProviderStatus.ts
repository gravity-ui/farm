import type {
    GetInstanceProviderStatusRequest,
    GetInstanceProviderStatusResponse,
} from '../../../shared/api/getInstanceProviderStatus';
import type {ApiAction} from '../../../shared/common';
import * as db from '../../utils/db';
import {getFarmProvider} from '../farm-provider';

const getInstanceProviderStatus: ApiAction<
    GetInstanceProviderStatusRequest,
    GetInstanceProviderStatusResponse
> = async ({data}) => {
    try {
        const instance = await db.getInstance(data.hash);

        if (!instance) {
            return {ok: false, message: `Instance ${data.hash} not found`};
        }

        const status = await getFarmProvider().getInstanceStatus(instance);

        return {ok: true, data: {status}};
    } catch (error) {
        return {ok: false, message: `Can't get status for instance "${data.hash}"`, data: {error}};
    }
};

export default getInstanceProviderStatus;
