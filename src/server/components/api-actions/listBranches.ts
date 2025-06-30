import type {ListBranchesRequest, ListBranchesResponse} from '../../../shared/api/listBranches';
import type {ApiAction} from '../../../shared/common';
import {getProjectFarmConfig, wrapInternalError} from '../../utils/common';
import {getVcs} from '../../utils/vcs';

const listBranches: ApiAction<ListBranchesRequest, ListBranchesResponse> = async ({
    data: {project},
    ctx,
}) => {
    try {
        const projectConfig = getProjectFarmConfig(project);
        if (!projectConfig.vcs) {
            return {ok: false, message: 'Project does not have a VCS'};
        }
        const vcsProvider = getVcs(projectConfig.vcs);
        const branches = await vcsProvider.listBranches(project);

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
