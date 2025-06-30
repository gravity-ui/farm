import {skipContext} from '@gravity-ui/data-source';

import type {ListBranchesRequest, ListBranchesResponse} from '../../shared/api/listBranches';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';

export const listBranchesSource = makePlainQueryDataSource({
    name: 'listBranches',
    fetch: skipContext(async ({project}: ListBranchesRequest) => {
        const {branches} = await api.request<ListBranchesRequest, ListBranchesResponse>({
            action: 'listBranches',
            data: {project},
        });

        return branches;
    }),
    options: {
        retry: false,
    },
});
