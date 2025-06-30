import type {ListProjectsRequest, ListProjectsResponse} from '../../../shared/api/listProjects';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import {getProjectsWithInstances} from '../../utils/instance';

const listProjects: ApiAction<ListProjectsRequest, ListProjectsResponse> = async ({ctx}) => {
    try {
        const projects = await getProjectsWithInstances();
        const response: ListProjectsResponse = {
            projects,
        };

        return {
            ok: true,
            data: response,
        };
    } catch (e) {
        ctx.logError('listProjects error', wrapInternalError(e));
        return {
            ok: false,
            message: 'Error occurred while listing projects',
        };
    }
};
export default listProjects;
