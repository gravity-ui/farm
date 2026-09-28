import {z} from 'zod';

import {isValidCommitForVcs} from '../../utils/commit';
import {getProjectFarmConfig} from '../../utils/common';
import {zodValidate} from '../../utils/validation';

import {i18n} from './i18n';
import type {FormValue} from './types';

const schema = z
    .object({
        project: z.string(),
        vcs: z.string(),
        branch: z.string(),
        commit: z.string(),
    })
    .required()
    .refine(
        ({project, vcs, commit}) => {
            const projectVcs = project ? getProjectFarmConfig(project).vcs || vcs : vcs;
            return isValidCommitForVcs(projectVcs, commit);
        },
        {
            path: ['commit'],
            message: i18n('commit-invalid'),
        },
    );

export const validate = zodValidate<FormValue>(schema);
