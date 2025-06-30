import {skipContext} from '@gravity-ui/data-source';

import type {
    GetProjectRepoUrlRequest,
    GetProjectRepoUrlResponse,
} from '../../shared/api/getProjectRepoUrl';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';

export const getProjectRepoUrlSource = makePlainQueryDataSource({
    name: 'getProjectRepoUrl',
    fetch: skipContext(async (params: GetProjectRepoUrlRequest) => {
        const {url} = await api.request<GetProjectRepoUrlRequest, GetProjectRepoUrlResponse>({
            action: 'getProjectRepoUrl',
            data: params,
        });

        return url;
    }),
    options: {
        retry: false,
    },
});
