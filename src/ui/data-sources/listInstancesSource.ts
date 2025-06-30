import {skipContext} from '@gravity-ui/data-source';

import type {
    ListProjectInstancesRequest,
    ListProjectInstancesResponse,
} from '../../shared/api/listProjectInstances';
import type {
    ListProviderInstancesRequest,
    ListProviderInstancesResponse,
} from '../../shared/api/listProviderInstances';
import type {ListQueueRequest, ListQueueResponse} from '../../shared/api/listQueue';
import type {Instance, InstanceProviderInfo, QueuedInstance} from '../../shared/common';
import {makePlainQueryDataSource} from '../components/data-source';
import {mapInstanceWithProvider} from '../hooks/utils';
import api from '../services/api';
import {DEFAULT_REFETCH_INTERVAL} from '../utils/constants';

function mergeInstanceInfo(
    instances: Instance[],
    providerInstances: InstanceProviderInfo[],
    queue: Instance[],
): QueuedInstance[] {
    const queueWithoutDeleting = queue.filter((instance) => instance.status !== 'deleting');

    return instances
        .map((instance) => mapInstanceWithProvider(instance, providerInstances))
        .map((instance) => ({
            ...instance,
            queuePosition: queueWithoutDeleting.findIndex(
                (queueItem) => queueItem.hash === instance.hash,
            ),
        }))
        .sort((a, b) => a.branch.localeCompare(b.branch));
}

export const listInstancesSource = makePlainQueryDataSource({
    name: 'listInstances',
    fetch: skipContext(async ({projectName, vcs, hash, labels}: ListProjectInstancesRequest) => {
        const [{instances}, {providerInstances = []}, {instances: queue}] = await Promise.all([
            api.request<ListProjectInstancesRequest, ListProjectInstancesResponse>({
                action: 'listProjectInstances',
                data: {projectName, vcs, hash, labels},
            }),
            api.request<ListProviderInstancesRequest, ListProviderInstancesResponse>({
                action: 'listProviderInstances',
            }),
            api.request<ListQueueRequest, ListQueueResponse>({action: 'listQueue'}),
        ]);

        return mergeInstanceInfo(instances, providerInstances, queue);
    }),
    options: {
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
    },
});
