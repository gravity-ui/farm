import type {
    GetProjectRepoUrlRequest,
    GetProjectRepoUrlResponse,
} from '../../../shared/api/getProjectRepoUrl';
import type {ApiAction} from '../../../shared/common';
import {getErrorMessage} from '../../utils/common';
import {getVcs} from '../../utils/vcs';

const getProjectRepoUrl: ApiAction<GetProjectRepoUrlRequest, GetProjectRepoUrlResponse> = async ({
    data: {project, vcs},
}) => {
    try {
        const vcsProvider = getVcs(vcs);
        const url = await vcsProvider.getProjectRepoUrl(project);

        return {ok: true, data: {url}};
    } catch (error) {
        return {
            ok: false,
            message: 'Failed to get repository URL',
            data: {error: getErrorMessage(error), url: ''},
        };
    }
};

export default getProjectRepoUrl;
