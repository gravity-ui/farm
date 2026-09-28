import {z} from 'zod';

import {isValidCommitForVcs} from '../../utils/commit';
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
    .refine(({vcs, commit}) => isValidCommitForVcs(vcs, commit), {
        path: ['commit'],
        message: i18n('commit-invalid'),
    });

export const validate = zodValidate<FormValue>(schema);
