import {z} from 'zod';

import {isCommitHash} from '../../../shared/commit';
import {zodValidate} from '../../utils/validation';

import {i18n} from './i18n';
import type {FormValue} from './types';

const schema = z
    .object({
        project: z.string(),
        vcs: z.string(),
        branch: z.string(),
        commit: z.string().refine((value) => !value || isCommitHash(value), {
            message: i18n('commit-invalid'),
        }),
    })
    .required();

export const validate = zodValidate<FormValue>(schema);
