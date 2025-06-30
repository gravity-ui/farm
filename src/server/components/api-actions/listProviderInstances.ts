import type {
    ListProviderInstancesRequest,
    ListProviderInstancesResponse,
} from '../../../shared/api/listProviderInstances';
import type {ApiAction} from '../../../shared/common';
import {getFarmProvider} from '../farm-provider';

const listProviderInstances: ApiAction<
    ListProviderInstancesRequest,
    ListProviderInstancesResponse
> = async () => {
    try {
        const providerInstances = await getFarmProvider().getInstances();

        return {ok: true, data: {providerInstances}};
    } catch (error) {
        return {
            ok: false,
            message: 'Error occured while listing provider instances',
            data: {error},
        };
    }
};

export default listProviderInstances;
