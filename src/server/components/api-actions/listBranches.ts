import {z} from 'zod';

import type {ListBranchesRequest, ListBranchesResponse} from '../../../shared/api/listBranches';
import type {ApiAction} from '../../../shared/common';
import {getProjectFarmConfig, wrapInternalError} from '../../utils/common';
import {getVcs} from '../../utils/vcs';

const schema = z.object({
    project: z.string().min(1),
    refType: z.enum(['branch', 'tag']).optional(),
    query: z.string().max(1024).optional(),
});

const listBranches: ApiAction<ListBranchesRequest, ListBranchesResponse> = async ({data, ctx}) => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        return {ok: false, message: 'Invalid request parameters', status: 400};
    }
    const {project, refType, query} = parsed.data;
    try {
        const projectConfig = getProjectFarmConfig(project);
        if (!projectConfig.vcs) {
            return {ok: false, message: 'Project does not have a VCS'};
        }
        const vcsProvider = getVcs(projectConfig.vcs);
        const branches = await vcsProvider.listBranches(project, {refType, query});

        return {
            ok: true,
            data: {
                branches,
            },
        };
    } catch (error) {
        if (error instanceof Error) {
            ctx.logError('Failed to list branches', wrapInternalError(error));
        }
        return {ok: false, message: 'Failed to list branches'};
    }
};

export default listBranches;
