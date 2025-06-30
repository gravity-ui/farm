import {skipContext} from '@gravity-ui/data-source';

import type {
    ListProviderInstancesRequest,
    ListProviderInstancesResponse,
} from '../../shared/api/listProviderInstances';
import type {ListQueueRequest, ListQueueResponse} from '../../shared/api/listQueue';
import {makePlainQueryDataSource} from '../components/data-source';
import {mapInstanceWithProvider} from '../hooks/utils';
import api from '../services/api';
import {DEFAULT_REFETCH_INTERVAL} from '../utils/constants';

export const getQueueSource = makePlainQueryDataSource({
    name: 'queue',
    fetch: skipContext(async () => {
        const [{providerInstances}, {instances}] = await Promise.all([
            api.request<ListProviderInstancesRequest, ListProviderInstancesResponse>({
                action: 'listProviderInstances',
            }),
            api.request<ListQueueRequest, ListQueueResponse>({action: 'listQueue'}),
        ]);

        return instances.map((instance) => mapInstanceWithProvider(instance, providerInstances));
    }),
    options: {
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
    },
});
