import {skipContext} from '@gravity-ui/data-source';

import type {
    ListVcsProvidersRequest,
    ListVcsProvidersResponse,
} from '../../shared/api/listVcsProviders';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';

export const listVcsProvidersSource = makePlainQueryDataSource({
    name: 'listVcsProviders',
    fetch: skipContext(async (_params: ListVcsProvidersRequest) => {
        const {providers} = await api.request<ListVcsProvidersRequest, ListVcsProvidersResponse>({
            action: 'listVcsProviders',
            data: {},
        });

        return providers;
    }),
    options: {
        retry: false,
    },
});
