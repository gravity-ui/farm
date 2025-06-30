import {skipContext} from '@gravity-ui/data-source';

import type {
    GetInstancesConfigsRequest,
    GetInstancesConfigsResponse,
} from '../../shared/api/getInstancesConfigs';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';

const fetch = skipContext(async ({project, branch, vcs}: GetInstancesConfigsRequest) => {
    if (!project || !branch || !vcs) {
        return [];
    }

    const {configs} = await api.request<GetInstancesConfigsRequest, GetInstancesConfigsResponse>({
        action: 'getInstancesConfigs',
        data: {project, vcs, branch},
    });

    return configs;
});

export const getInstancesConfigsSource = makePlainQueryDataSource({
    name: 'getInstancesConfigs',
    fetch,
    transformResponse: (response: GetInstancesConfigsResponse['configs']) =>
        response.filter(Boolean),
    options: {
        retry: false,
    },
});
