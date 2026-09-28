import {skipContext} from '@gravity-ui/data-source';

import type {
    GetInstancesConfigsRequest,
    GetInstancesConfigsResponse,
} from '../../shared/api/getInstancesConfigs';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';
import {isValidCommitForVcs} from '../utils/commit';
import {getProjectFarmConfig} from '../utils/common';

const fetch = skipContext(async ({project, branch, commit, vcs}: GetInstancesConfigsRequest) => {
    if (!project || !branch || !vcs) {
        return [];
    }

    const projectVcs = getProjectFarmConfig(project).vcs || vcs;
    if (commit && !isValidCommitForVcs(projectVcs, commit)) {
        return [];
    }

    const {configs} = await api.request<GetInstancesConfigsRequest, GetInstancesConfigsResponse>({
        action: 'getInstancesConfigs',
        data: {project, vcs, branch, commit},
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
