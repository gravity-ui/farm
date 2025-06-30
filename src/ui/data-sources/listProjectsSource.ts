import {skipContext} from '@gravity-ui/data-source';

import type {ListProjectsRequest, ListProjectsResponse} from '../../shared/api/listProjects';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';
import {DEFAULT_REFETCH_INTERVAL} from '../utils/constants';

const fetch = skipContext(async () => {
    const {projects} = await api.request<ListProjectsRequest, ListProjectsResponse>({
        action: 'listProjects',
    });

    return projects;
});

export const listProjectsSource = makePlainQueryDataSource({
    name: 'listProjects',
    fetch,
    transformResponse: (projects: ListProjectsResponse['projects']) =>
        projects?.filter(({items}) => items.length > 0),
    options: {
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
    },
});
