import {capitalize} from 'lodash';

import type {
    ListVcsProvidersRequest,
    ListVcsProvidersResponse,
} from '../../../shared/api/listVcsProviders';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import {coreRegistry} from '../core-plugin-registry';

const listVcsProviders: ApiAction<ListVcsProvidersRequest, ListVcsProvidersResponse> = async ({
    ctx,
}) => {
    try {
        const vcsPlugins = coreRegistry.vcs.getPlugins();
        const providers = Object.entries(vcsPlugins).map(([id]) => ({
            id,
            name: capitalize(id),
        }));

        const response: ListVcsProvidersResponse = {
            providers,
        };

        return {
            ok: true,
            data: response,
        };
    } catch (e) {
        ctx.logError('listVcsProviders error', wrapInternalError(e));
        return {
            ok: false,
            message: 'Error occurred while listing VCS providers',
        };
    }
};

export default listVcsProviders;
