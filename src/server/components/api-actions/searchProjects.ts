import type {
    SearchProjectsRequest,
    SearchProjectsResponse,
} from '../../../shared/api/searchProjects';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';

import listProjects from './listProjects';

const searchProjects: ApiAction<SearchProjectsRequest, SearchProjectsResponse> = async ({
    data,
    ctx,
}) => {
    const pattern = data.projectPattern;

    try {
        const {data: listData} = await listProjects({ctx, data: {}});
        const projects = listData?.projects?.filter((project) => {
            return project.name.includes(pattern);
        });

        return {ok: true, data: {projects}};
    } catch (error) {
        ctx.logError('Search projects error', wrapInternalError(error));
        return {ok: false};
    }
};

export default searchProjects;
