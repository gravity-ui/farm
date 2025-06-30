import {skipContext} from '@gravity-ui/data-source';

import type {GetInstanceRequest, GetInstanceResponse} from '../../shared/api/getInstance';
import type {
    ListProviderInstancesRequest,
    ListProviderInstancesResponse,
} from '../../shared/api/listProviderInstances';
import {makePlainQueryDataSource} from '../components/data-source';
import {mapInstanceWithProvider} from '../hooks/utils';
import api from '../services/api';
import {DEFAULT_REFETCH_INTERVAL} from '../utils/constants';

export const getInstanceSource = makePlainQueryDataSource({
    name: 'getInstance',
    fetch: skipContext(async ({hash}: GetInstanceRequest) => {
        const [instance, {providerInstances = []}] = await Promise.all([
            api.request<GetInstanceRequest, GetInstanceResponse>({
                action: 'getInstance',
                data: {
                    hash,
                },
            }),
            api.request<ListProviderInstancesRequest, ListProviderInstancesResponse>({
                action: 'listProviderInstances',
            }),
        ]);

        return {
            ...instance,
            instance:
                instance.instance && mapInstanceWithProvider(instance.instance, providerInstances),
        };
    }),
    options: {
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
        retry: false,
    },
});
