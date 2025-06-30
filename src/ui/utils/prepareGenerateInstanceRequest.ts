import type {GenerateInstanceRequest} from '../../shared/api/generate';

export const prepareGenerateInstanceRequest = (
    payload: Partial<GenerateInstanceRequest>,
): GenerateInstanceRequest => {
    if (!payload.project) {
        throw new Error('Project should be defined!');
    }

    if (!payload.branch) {
        throw new Error('Branch should be defined!');
    }

    if (!payload.vcs) {
        throw new Error('VCS should be defined!');
    }

    return {
        project: payload.project ?? '',
        branch: payload.branch ?? '',
        vcs: payload.vcs ?? '',
        ...payload,
    };
};
